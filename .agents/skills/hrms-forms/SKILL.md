---
name: hrms-forms
description: Type-safe form validation using React Hook Form v7 and Zod. Use when building forms with zodResolver, field arrays, multi-step wizards, or server-side validation in the Interview Bot frontend.
---

# React Hook Form + Zod Validation

Build type-safe, performant forms with shared validation schemas.

## Quick Start

```bash
npm install react-hook-form zod @hookform/resolvers
```

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required').max(100),
})

type FormData = z.infer<typeof schema>

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '' },
  })

  const onSubmit = async (data: FormData) => {
    // data is fully typed and validated
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('email')} />
      {form.formState.errors.email && (
        <p>{form.formState.errors.email.message}</p>
      )}
      <input {...form.register('name')} />
      {form.formState.errors.name && (
        <p>{form.formState.errors.name.message}</p>
      )}
      <button type="submit">Submit</button>
    </form>
  )
}
```

## With shadcn/ui FormField (Interview Bot Pattern)

```typescript
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function JobPostingForm() {
  const form = useForm<z.infer<typeof jobPostingSchema>>({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      title: '',
      job_description: '',
      role_type: 'technical',
      interview_format: 'text',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Senior Backend Engineer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Create Job Posting</Button>
      </form>
    </Form>
  )
}
```

## Validation Modes

```typescript
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onSubmit',    // Default — validate on submit (best performance)
  // mode: 'onBlur',   // Validate when field loses focus
  // mode: 'onChange',  // Validate on every keystroke (worst performance)
})
```

## Common Zod Patterns

### Email Validation

```typescript
const emailSchema = z.string().email('Invalid email address')
```

### URL Validation

```typescript
const urlSchema = z.string().url('Invalid URL').optional().or(z.literal(''))
```

### Optional with Transform

```typescript
const schema = z.object({
  notes: z.string().optional().transform(v => v || undefined),
  duration: z.string().transform(v => parseInt(v, 10)).pipe(z.number().positive()),
})
```

### Cross-field Validation

```typescript
const schema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  data => data.endDate > data.startDate,
  { message: 'End date must be after start date', path: ['endDate'] }
)
```

### Discriminated Union (interview format config)

```typescript
const interviewConfigSchema = z.discriminatedUnion('format', [
  z.object({ format: z.literal('text'), maxMessages: z.number().min(5) }),
  z.object({ format: z.literal('voice'), maxDurationMinutes: z.number().min(5) }),
  z.object({ format: z.literal('video'), maxDurationMinutes: z.number().min(5), cameraRequired: z.boolean() }),
])
```

## Dynamic Fields with useFieldArray

```typescript
import { useFieldArray } from 'react-hook-form'

const schema = z.object({
  required_skills: z.array(z.object({
    skill: z.string().min(1, 'Skill name required'),
    weight: z.number().min(1).max(10),
  })).min(1, 'At least one skill required'),
})

function SkillsForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { required_skills: [{ skill: '', weight: 5 }] },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'required_skills',
  })

  return (
    <div>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...form.register(`required_skills.${index}.skill`)} />
          <input type="number" {...form.register(`required_skills.${index}.weight`, { valueAsNumber: true })} />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ skill: '', weight: 5 })}>
        Add Skill
      </button>
    </div>
  )
}
```

## Server-Side Validation (Same Schema on FastAPI)

Zod schemas on the frontend can mirror Pydantic schemas on the backend. Keep them in sync manually or generate from OpenAPI spec.

```typescript
// Frontend: types/schemas.ts
export const jobPostingSchema = z.object({
  title: z.string().min(3),
  job_description: z.string().min(50),
  role_type: z.enum(['technical', 'non_technical', 'mixed']),
  interview_format: z.enum(['text', 'voice', 'video']),
  required_skills: z.array(z.string()).min(1),
})
```

```python
# Backend: models/schemas.py (Pydantic equivalent)
class JobPostingCreate(BaseModel):
    title: str = Field(min_length=3)
    job_description: str = Field(min_length=50)
    role_type: Literal["technical", "non_technical", "mixed"]
    interview_format: Literal["text", "voice", "video"]
    required_skills: list[str] = Field(min_length=1)
```

## Server Error Handling in Forms

```typescript
const onSubmit = async (data: FormData) => {
  try {
    await api.createJobPosting(data)
    toast.success('Job posting created!')
  } catch (err: any) {
    if (err.status === 422 && err.details) {
      Object.entries(err.details).forEach(([field, message]) => {
        form.setError(field as keyof FormData, {
          message: message as string,
        })
      })
      return
    }
    toast.error(err.message || 'Something went wrong')
  }
}
```

## register vs Controller

```typescript
// register — for native HTML inputs (best performance)
<input {...form.register('email')} />
<input type="number" {...form.register('duration', { valueAsNumber: true })} />

// Controller — for third-party components (Select, DatePicker, etc.)
<Controller
  control={form.control}
  name="interview_format"
  render={({ field }) => (
    <Select onValueChange={field.onChange} defaultValue={field.value}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="text">Text Chat</SelectItem>
        <SelectItem value="voice">Voice</SelectItem>
        <SelectItem value="video">Video</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
```

## Performance Tips

1. Use `onSubmit` mode (default) unless UX requires earlier feedback
2. Prefer `register` over `Controller` for native inputs
3. Use `useFieldArray` key prop (`field.id`) not array index
4. Avoid `onChange` mode on large forms
5. Share Zod schemas between frontend validation and API request types — single source of truth
