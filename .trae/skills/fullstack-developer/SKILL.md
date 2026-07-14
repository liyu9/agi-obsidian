---
name: fullstack-developer
description: Full-stack development skill covering frontend, backend, API design, database optimization, and testing. Invoke when building full-stack applications, APIs, or when backend/frontend integration is needed.
---

# Full-Stack Developer

A comprehensive skill for full-stack application development, covering frontend, backend, API design, database patterns, testing, and deployment.

## When to Use

Use this skill when:
- Building full-stack web applications
- Designing and implementing RESTful APIs
- Working with databases (SQL and NoSQL)
- Implementing authentication and authorization
- Setting up testing strategies
- Backend architecture decisions
- Frontend-backend integration

## Core Principles

### 1. Design First, Code Second
- Write specifications before implementation
- Define API contracts upfront
- Plan data models and relationships
- Consider scalability from the start

### 2. Clean Architecture
- Separate concerns (UI, business logic, data access)
- Use repository patterns for data access
- Implement service layers for business logic
- Keep handlers thin

### 3. API Design

RESTful URL Structure:
```
GET    /api/resources           # List
GET    /api/resources/:id       # Get one
POST   /api/resources           # Create
PUT    /api/resources/:id       # Replace
PATCH  /api/resources/:id       # Update
DELETE /api/resources/:id       # Delete
```

Query parameters for filtering, sorting, pagination:
```
GET /api/markets?status=active&sort=volume&limit=20&offset=0
```

### 4. Database Best Practices

**N+1 Query Prevention**:
```typescript
// BAD: N+1 queries
for (const market of markets) {
  market.creator = await getUser(market.creator_id)
}

// GOOD: Single batch query
const creatorIds = markets.map(m => m.creator_id)
const creators = await getUsers(creatorIds)
```

**Query Optimization**:
```typescript
// GOOD: Select only needed columns
const { data } = await supabase
  .from('markets')
  .select('id, name, status')
  .eq('status', 'active')

// BAD: Select everything
const { data } = await supabase.from('markets').select('*')
```

### 5. Authentication & Authorization

JWT Token Validation:
```typescript
interface JWTPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
  } catch (error) {
    throw new ApiError(401, 'Invalid token')
  }
}
```

Role-Based Access Control:
```typescript
const rolePermissions: Record<User['role'], Permission[]> = {
  admin: ['read', 'write', 'delete', 'admin'],
  user: ['read', 'write']
}

export function hasPermission(user: User, permission: Permission): boolean {
  return rolePermissions[user.role].includes(permission)
}
```

### 6. Error Handling

Centralized error handler:
```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
  }
}

export function errorHandler(error: unknown, req: Request): Response {
  if (error instanceof ApiError) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: error.statusCode })
  }
  // Log unexpected errors
  console.error('Unexpected error:', error)
  return NextResponse.json({
    success: false,
    error: 'Internal server error'
  }, { status: 500 })
}
```

### 7. Caching Strategies

Cache-Aside Pattern:
```typescript
async function getMarketWithCache(id: string): Promise<Market> {
  const cached = await redis.get(`market:${id}`)
  if (cached) return JSON.parse(cached)

  const market = await db.markets.findUnique({ where: { id } })
  if (!market) throw new Error('Market not found')

  await redis.setex(`market:${id}`, 300, JSON.stringify(market))
  return market
}
```

### 8. Testing Strategy

Unit tests for core logic:
```typescript
describe('MarketService', () => {
  it('should search markets by query', async () => {
    const results = await service.searchMarkets('crypto')
    expect(results).toHaveLength(10)
    expect(results[0]).toMatchObject({ name: expect.any(String) })
  })
})
```

Integration tests for APIs:
```typescript
describe('POST /api/markets', () => {
  it('should create a new market', async () => {
    const response = await request(app)
      .post('/api/markets')
      .send({ name: 'Bitcoin', type: 'crypto' })
      .expect(201)

    expect(response.body.success).toBe(true)
  })
})
```

### 9. Background Jobs

Simple queue pattern:
```typescript
class JobQueue<T> {
  private queue: T[] = []
  private processing = false

  async add(job: T): Promise<void> {
    this.queue.push(job)
    if (!this.processing) this.process()
  }

  private async process(): Promise<void> {
    this.processing = true
    while (this.queue.length > 0) {
      const job = this.queue.shift()!
      try {
        await this.execute(job)
      } catch (error) {
        console.error('Job failed:', error)
      }
    }
    this.processing = false
  }
}
```

### 10. Logging & Monitoring

Structured logging:
```typescript
interface LogContext {
  userId?: string
  requestId?: string
  method?: string
  path?: string
  [key: string]: unknown
}

logger.error('Failed to fetch markets', error as Error, {
  requestId,
  userId: user.id
})
```

## Quality Checklist

- [ ] API endpoints follow REST conventions
- [ ] Input validation on all endpoints
- [ ] Error responses are consistent
- [ ] Authentication on protected routes
- [ ] Authorization checks per endpoint
- [ ] Queries optimized (no N+1)
- [ ] Sensitive data not logged
- [ ] Unit tests for service layer
- [ ] Integration tests for APIs
- [ ] Caching for expensive operations
- [ ] Rate limiting on public endpoints