# TypeScript Types Tutorial

## What are Types?

Types in TypeScript help you define the **shape** and **structure** of your data. They catch errors before runtime and provide better autocomplete in your editor.

---

## 1. Basic Types

```typescript
// Primitive types
let name: string = "John";
let age: number = 25;
let isActive: boolean = true;
let data: any = "anything"; // Avoid using 'any' when possible

// Arrays
let numbers: number[] = [1, 2, 3];
let names: string[] = ["Alice", "Bob"];

// Alternative array syntax
let scores: Array<number> = [90, 85, 88];
```

---

## 2. Interfaces - Defining Object Shapes

Interfaces define the structure of objects. They're like blueprints.

```typescript
// Define an interface
interface User {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean; // Optional property (?)
}

// Use the interface
const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  // isAdmin is optional, so we can omit it
};

// This will give an error - missing required properties
const badUser: User = {
  id: 2,
  // Error: missing 'name' and 'email'
};
```

---

## 3. Optional vs Required Properties

```typescript
interface Product {
  id: number;           // Required
  name: string;         // Required
  description?: string; // Optional (notice the ?)
  price: number;        // Required
}

// Valid - description is optional
const product1: Product = {
  id: 1,
  name: "Laptop",
  price: 999,
};

// Also valid - with description
const product2: Product = {
  id: 2,
  name: "Mouse",
  description: "Wireless mouse",
  price: 29,
};
```

---

## 4. Nested Interfaces

You can nest interfaces inside each other:

```typescript
interface Address {
  street: string;
  city: string;
  country: string;
}

interface Person {
  name: string;
  age: number;
  address: Address; // Nested interface
}

const person: Person = {
  name: "Bob",
  age: 30,
  address: {
    street: "123 Main St",
    city: "Bangkok",
    country: "Thailand",
  },
};
```

---

## 5. Typing Function Parameters and Return Values

```typescript
// Function with typed parameters and return type
function addNumbers(a: number, b: number): number {
  return a + b;
}

// Function with no return value (void)
function logMessage(message: string): void {
  console.log(message);
}

// Arrow function with types
const multiply = (x: number, y: number): number => {
  return x * y;
};
```

---

## 6. Typing Express Request and Response

This is what we did in the controller:

```typescript
import { Request, Response } from "express";

// Basic typing
export const myController = async (req: Request, res: Response) => {
  // req and res are now typed
};

// Advanced: Type the request body
interface LoginBody {
  email: string;
  password: string;
}

export const login = async (
  req: Request<{}, {}, LoginBody>, // <Params, ResBody, ReqBody>
  res: Response
) => {
  const { email, password } = req.body; // TypeScript knows the shape!
  // ...
};
```

---

## 7. Union Types (OR)

```typescript
// A value can be one of several types
let id: string | number;
id = "abc123"; // Valid
id = 123;      // Also valid
id = true;     // Error: boolean is not allowed

// Useful for optional values
let result: string | null = null;
```

---

## 8. Type Aliases vs Interfaces

Both can define object shapes, but have slight differences:

```typescript
// Type alias
type Point = {
  x: number;
  y: number;
};

// Interface
interface Point2D {
  x: number;
  y: number;
}

// Both work the same for objects
// Use interfaces for objects, types for unions/primitives
```

---

## 9. Real Example: Our Mapbox Types

Let's break down what we created:

```typescript
// 1. Define the structure of coordinates
export interface MapboxCoordinates {
  latitude: number;
  longitude: number;
}

// 2. Define nested context
export interface MapboxContext {
  country?: {
    name: string;
    country_code: string;
  };
  place?: {
    name: string;
  };
}

// 3. Define the main suggestion object
export interface MapboxSuggestion {
  name: string;                    // Required
  mapbox_id: string;               // Required
  coordinates?: MapboxCoordinates; // Optional
  context?: MapboxContext;         // Optional nested object
  poi_category_ids?: string[];     // Optional array
}

// 4. Define the request body
export interface MapboxRequestBody {
  suggestions: MapboxSuggestion[]; // Array of suggestions
}
```

---

## 10. Benefits You Get

### ✅ Autocomplete
When you type `suggestion.`, your editor shows all available properties.

### ✅ Error Detection
```typescript
const lat = suggestion.coordinates.latitude; 
// Error if coordinates is undefined!
```

### ✅ Safe Access with Optional Chaining
```typescript
const city = suggestion.context?.place?.name;
// Returns undefined if context or place is missing
```

### ✅ Documentation
Types serve as inline documentation for your code.

---

## Quick Reference

| Syntax | Meaning |
|--------|---------|
| `property: type` | Required property |
| `property?: type` | Optional property |
| `type[]` | Array of type |
| `type \| null` | Can be type or null |
| `Record<string, any>` | Object with string keys |

---

## Next Steps

1. Always define interfaces for your API request/response bodies
2. Type your function parameters
3. Use optional chaining (`?.`) for optional properties
4. Avoid `any` - use specific types instead

