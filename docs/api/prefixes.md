# Prefixes

Prefixes map short path segments to base URLs. Register a prefix once at bootstrap, then reference endpoints by short path everywhere else.

## Registering Prefixes

```javascript
import { api } from '@anzaui/anza/api';

api.prefix.add('default', 'https://api.example.com');
api.prefix.add('auth', 'https://auth.example.com');
api.prefix.add('cdn', 'https://cdn.example.com');
```

## Path Resolution

Prefix matching is automatic on every request:

```javascript
// Matches /auth/ prefix
api.get('/auth/login'); // https://auth.example.com/login

// No prefix match — falls back to root/default
api.get('/user/profile'); // https://api.example.com/user/profile

// Fully qualified URLs pass through unchanged
api.get('https://other.com/data'); // left as-is
```

The resolver strips the prefix from the path and appends the remainder to the base URL, normalizing slashes automatically.

## Root Fallback

If no prefix matches, the resolver checks for a `root` or `default` prefix:

```javascript
api.prefix.add('default', 'https://api.example.com');

// /user/profile -> https://api.example.com/user/profile
api.get('/user/profile');
```

Without a root fallback, the path is sent as-is.

## Clearing Prefixes

```javascript
api.prefix.clear(); // removes all registered prefixes
```

Useful in tests when switching between environments.

## Multiple Environments

Switch environments by re-registering prefixes:

```javascript
// Development
api.prefix.add('default', 'http://localhost:3000');

// Production (clear first)
api.prefix.clear();
api.prefix.add('default', 'https://api.example.com');
```

## Prefix Matching Rules

Prefixes are checked in insertion order. The first matching prefix wins:

```javascript
api.prefix.add('api', 'https://api.example.com');
api.prefix.add('api-v2', 'https://api-v2.example.com');

// /api/users matches the first prefix
api.get('/api/users'); // https://api.example.com/users
```

To avoid ambiguity, use more specific prefix names or register longer prefixes first.
