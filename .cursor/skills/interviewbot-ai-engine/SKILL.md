---
name: interviewbot-ai-engine
description: Orchestrate LLM-powered interviews including prompt engineering, dynamic question generation, multi-model fallback, scoring rubrics, and code evaluation. Use when working with AI interview logic, OpenAI/Claude integration, scoring, or prompt templates.
---

# Interview Bot AI Engine

## Architecture

The AI engine sits behind an abstraction layer so LLM providers can be swapped.

```
InterviewService → AIEngine → LLMProvider (OpenAI | Claude)
                            → ScoringService
                            → CodeEvalService → Judge0
```

## LLM Provider Abstraction

```python
# src/interviewbot/services/ai_engine.py
from abc import ABC, abstractmethod
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from interviewbot.config import get_settings

class LLMProvider(ABC):
    @abstractmethod
    async def chat(self, messages: list[dict], temperature: float = 0.7) -> str: ...

class OpenAIProvider(LLMProvider):
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"

    async def chat(self, messages: list[dict], temperature: float = 0.7) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=1024,
        )
        return response.choices[0].message.content

class ClaudeProvider(LLMProvider):
    def __init__(self):
        settings = get_settings()
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-20250514"

    async def chat(self, messages: list[dict], temperature: float = 0.7) -> str:
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_msgs = [m for m in messages if m["role"] != "system"]
        response = await self.client.messages.create(
            model=self.model,
            system=system,
            messages=user_msgs,
            temperature=temperature,
            max_tokens=1024,
        )
        return response.content[0].text

class AIEngine:
    def __init__(self):
        self.primary = OpenAIProvider()
        self.fallback = ClaudeProvider()

    async def chat(self, messages: list[dict], temperature: float = 0.7) -> str:
        try:
            return await self.primary.chat(messages, temperature)
        except Exception:
            return await self.fallback.chat(messages, temperature)
```

## System Prompt Templates

### Technical Interview

```python
TECHNICAL_INTERVIEWER_PROMPT = """You are a senior technical interviewer conducting a {interview_format} interview for the role of {job_title}.

## Context
- Job Description: {job_description}
- Required Skills: {required_skills}
- Difficulty: {difficulty}
- Questions Remaining: {questions_remaining} of {total_questions}

## Rules
1. Ask ONE question at a time. Wait for the candidate's response before asking the next.
2. Start with an introductory question, then progress from easier to harder.
3. Ask follow-up questions when the candidate's answer is vague, incomplete, or incorrect.
4. Cover these areas: {required_skills}
5. For coding questions, present a clear problem statement with input/output examples.
6. Be professional, encouraging, and conversational — not robotic.
7. Never reveal the expected answer or give hints unless the candidate is completely stuck.
8. After all questions, thank the candidate and end the interview.

## Response Format
Respond with ONLY the interview question or follow-up. Do not include metadata, scoring, or internal notes.
"""
```

### Behavioral Interview

```python
BEHAVIORAL_INTERVIEWER_PROMPT = """You are an experienced behavioral interviewer for the role of {job_title}.

## Context
- Job Description: {job_description}
- Questions Remaining: {questions_remaining} of {total_questions}

## Rules
1. Use the STAR method (Situation, Task, Action, Result) to probe answers.
2. Ask about: leadership, conflict resolution, teamwork, adaptability, communication.
3. Ask follow-up questions to get specific examples, not generic answers.
4. If the candidate gives a hypothetical answer ("I would..."), redirect: "Can you share a specific time when..."
5. Be warm and professional.

## Response Format
Respond with ONLY the interview question or follow-up.
"""
```

### Skill Extraction from JD

```python
SKILL_EXTRACTION_PROMPT = """Extract the required technical and soft skills from this job description.

Job Description:
{job_description}

Return a JSON object with:
{{
  "technical_skills": ["skill1", "skill2", ...],
  "soft_skills": ["skill1", "skill2", ...],
  "experience_level": "junior|mid|senior|lead",
  "suggested_questions": ["question1", "question2", ...]
}}

Return ONLY valid JSON, no markdown or explanation.
"""
```

## Conversation Memory Management

Keep the full conversation in memory for context, but manage token limits.

```python
class InterviewConversation:
    def __init__(self, system_prompt: str, max_history: int = 30):
        self.system_prompt = system_prompt
        self.messages: list[dict] = []
        self.max_history = max_history

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        if len(self.messages) > self.max_history:
            self.messages = self.messages[-self.max_history:]

    def get_messages(self) -> list[dict]:
        return [{"role": "system", "content": self.system_prompt}] + self.messages

    def get_question_count(self) -> int:
        return sum(1 for m in self.messages if m["role"] == "assistant")
```

## Dynamic Question Flow

```python
async def generate_next_question(
    engine: AIEngine,
    conversation: InterviewConversation,
    interview_config: dict,
) -> dict:
    questions_asked = conversation.get_question_count()
    total = interview_config["num_questions"]

    if questions_asked >= total:
        return {"type": "end", "content": "Thank you for your time! The interview is now complete."}

    response = await engine.chat(conversation.get_messages())
    conversation.add_message("assistant", response)

    return {"type": "question", "content": response, "progress": questions_asked + 1, "total": total}

async def process_candidate_response(
    engine: AIEngine,
    conversation: InterviewConversation,
    candidate_message: str,
) -> None:
    conversation.add_message("user", candidate_message)
```

## Scoring Rubric

```python
SCORING_PROMPT = """You are an interview evaluator. Analyze the interview transcript and score the candidate.

## Transcript
{transcript}

## Job Context
- Role: {job_title}
- Required Skills: {required_skills}

## Score each dimension from 0.0 to 10.0:

Return a JSON object:
{{
  "skill_scores": {{
    "skill_name": {{"score": 8.5, "evidence": "Quote from transcript..."}},
    ...
  }},
  "behavioral_scores": {{
    "communication": {{"score": 7.0, "evidence": "..."}},
    "problem_solving": {{"score": 8.0, "evidence": "..."}},
    "cultural_fit": {{"score": 6.5, "evidence": "..."}}
  }},
  "overall_score": 7.5,
  "confidence_score": 0.85,
  "summary": "2-3 sentence summary of candidate performance",
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "recommendation": "Strong Hire | Hire | No Hire"
}}

Return ONLY valid JSON.
"""
```

## Code Evaluation

```python
# src/interviewbot/services/code_eval_service.py
import httpx
from interviewbot.config import get_settings

LANGUAGE_IDS = {
    "python": 71, "javascript": 63, "java": 62,
    "cpp": 54, "c": 50, "typescript": 74, "go": 60,
}

class CodeEvalService:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.judge0_api_url

    async def execute_code(self, source_code: str, language: str, stdin: str = "") -> dict:
        lang_id = LANGUAGE_IDS.get(language)
        if not lang_id:
            return {"error": f"Unsupported language: {language}"}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/submissions?wait=true",
                json={
                    "source_code": source_code,
                    "language_id": lang_id,
                    "stdin": stdin,
                },
                timeout=30,
            )
            result = response.json()

        return {
            "stdout": result.get("stdout", ""),
            "stderr": result.get("stderr", ""),
            "status": result.get("status", {}).get("description", ""),
            "time": result.get("time"),
            "memory": result.get("memory"),
        }
```

## AI Code Review Prompt

After the candidate submits code, the AI evaluates it:

```python
CODE_REVIEW_PROMPT = """Review this code submitted during an interview.

## Problem
{problem_statement}

## Candidate's Code ({language})
```
{code}
```

## Execution Result
- Output: {stdout}
- Errors: {stderr}
- Status: {status}
- Time: {time}s
- Memory: {memory}KB

## Evaluate:
1. Correctness: Does it solve the problem?
2. Code quality: Readability, naming, structure
3. Efficiency: Time and space complexity
4. Edge cases: Does it handle edge cases?

Return JSON:
{{
  "correctness": {{"score": 8.0, "notes": "..."}},
  "quality": {{"score": 7.5, "notes": "..."}},
  "efficiency": {{"score": 6.0, "notes": "Big-O analysis..."}},
  "edge_cases": {{"score": 5.0, "notes": "..."}},
  "overall": 6.6,
  "follow_up_question": "A question to ask about their solution"
}}

Return ONLY valid JSON.
"""
```

## Token Usage Tracking

```python
class TokenTracker:
    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def record(self, input_tokens: int, output_tokens: int):
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens

    @property
    def estimated_cost_usd(self) -> float:
        # GPT-4o pricing: $2.50/1M input, $10/1M output
        return (self.total_input_tokens * 2.5 + self.total_output_tokens * 10) / 1_000_000
```

## Key Rules

1. **Always use the AIEngine abstraction** -- never call OpenAI/Claude directly in routers
2. **System prompts are templates** -- fill with job-specific context at runtime
3. **One question at a time** -- never dump multiple questions
4. **Follow-up on vague answers** -- the AI must probe deeper
5. **All LLM JSON responses must be validated** -- parse with try/except, retry on failure
6. **Score with evidence** -- every score needs a supporting quote from the transcript
7. **Temperature 0.7 for interviews** (creative), **0.2 for scoring** (consistent)
8. **Track token usage** per interview for cost analytics
9. **Never reveal expected answers** to candidates
10. **Fallback gracefully** -- if primary LLM fails, use fallback provider
