[fast-prng-wasm](../../as-api.md) / Xoshiro256Plus\_SIMD

# Xoshiro256Plus\_SIMD

An AssemblyScript implementation of the Xoshiro256+ pseudo random number generator,
a 64-bit generator with 256 bits of state (2^256 period) and a jump function for
unique sequence selection.

This version supports WebAssembly SIMD to provide 2 random outputs for the price of 1
when using array output functions.

## Variables

### SEED\_COUNT

```ts
const SEED_COUNT: i32 = 8;
```

Number of seeds required for this generator's [setSeeds](#setseeds) function.

## Functions

### batchTestUnitCirclePoints()

```ts
function batchTestUnitCirclePoints(count): number;
```

Monte Carlo test: Generates random (x,y) coordinates in range (-1, 1), and
counts how many of them fall inside the unit circle with radius 1.

Can be used to estimate pi (π).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `count` | `number` | The number of random (x,y) coordinate points in (-1, 1) to generate and check. |

#### Returns

`number`

The number of random points which fell *inside* of the unit circle with radius 1.

***

### coord53()

```ts
function coord53(): number;
```

Gets this generator's next 53-bit floating point number in range (-1, 1).

Discards the additional random number generated with SIMD.

Can be considered part of a "coordinate" in a unit circle with radius 1.
Useful for Monte Carlo simulation.

#### Returns

`number`

A floating point number in range (-1, 1).

***

### coord53Array()

```ts
function coord53Array(arr): void;
```

Fills the provided array with this generator's next set of 53-bit floating point numbers
in range (-1, 1).

Utilizes SIMD.

Useful for Monte Carlo simulation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### coord53Squared()

```ts
function coord53Squared(): number;
```

Gets the square of this generator's next 53-bit floating point number in range (-1, 1).

Discards the additional random number generated with SIMD.

Useful for Monte Carlo simulation.

#### Returns

`number`

A floating point number in range (-1, 1), multiplied by itself.

***

### coord53SquaredArray()

```ts
function coord53SquaredArray(arr): void;
```

Fills the provided array with the squares of this generator's next set of floating 
point numbers in range (-1, 1).

Utilizes SIMD.

Useful for Monte Carlo simulation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### coord53Squaredx2()

```ts
function coord53Squaredx2(): object;
```

Gets the square of this generator's next 2 floating point numbers in range (-1, 1).

Useful for Monte Carlo simulation.

#### Returns

`object`

2 floating point numbers in range (-1, 1), each multiplied by itself.

***

### coord53x2()

```ts
function coord53x2(): object;
```

Gets this generator's next 2 floating point numbers in range (-1, 1).

Can be considered a "coordinate" in a unit circle with radius 1.
Useful for Monte Carlo simulation.

#### Returns

`object`

2 floating point numbers in range (-1, 1).

***

### float53()

```ts
function float53(): number;
```

Gets this generator's next 53-bit floating point number in range [0, 1).

Discards the additional random number generated with SIMD.

#### Returns

`number`

A floating point number in range [0, 1).

***

### float53Array()

```ts
function float53Array(arr): void;
```

Fills the provided array with this generator's next set of 53-bit floating point numbers
in range [0, 1).

Utilizes SIMD.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### float53x2()

```ts
function float53x2(): object;
```

Gets this generator's next 2 floating point numbers in range [0, 1).

#### Returns

`object`

2 floating point numbers in range [0, 1).

***

### jump()

```ts
function jump(): void;
```

Advances the state by 2^128 steps every call. Can be used to generate 2^128 
non-overlapping subsequences (with the same seed) for parallel computations.

#### Returns

`void`

***

### setSeeds()

```ts
function setSeeds(
   a, 
   b, 
   c, 
   d, 
   e, 
   f, 
   g, 
   h): void;
```

Initializes this generator's internal state with the provided random seeds.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `a` | `number` |
| `b` | `number` |
| `c` | `number` |
| `d` | `number` |
| `e` | `number` |
| `f` | `number` |
| `g` | `number` |
| `h` | `number` |

#### Returns

`void`

***

### uint32AsFloat()

```ts
function uint32AsFloat(): number;
```

Gets this generator's next unsigned 32-bit integer.

Discards the additional random number generated with SIMD.

#### Returns

`number`

An unsigned 32-bit integer.

***

### uint32AsFloatArray()

```ts
function uint32AsFloatArray(arr): void;
```

Fills the provided array with this generator's next set of unsigned 32-bit integers.

Utilizes SIMD.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### uint32AsFloatx2()

```ts
function uint32AsFloatx2(): object;
```

Gets this generator's next 2 unsigned 32-bit integers.

#### Returns

`object`

2 unsigned 32-bit integers, returned as `f64`s
so that the JS runtime converts them to `number`s.

***

### uint53AsFloat()

```ts
function uint53AsFloat(): number;
```

Gets this generator's next unsigned 53-bit integer.

Discards the additional random number generated with SIMD.

#### Returns

`number`

An unsigned 53-bit integer.

***

### uint53AsFloatArray()

```ts
function uint53AsFloatArray(arr): void;
```

Fills the provided array with this generator's next set of unsigned 53-bit integers.

Utilizes SIMD.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### uint53AsFloatx2()

```ts
function uint53AsFloatx2(): object;
```

Gets this generator's next 2 unsigned 53-bit integers.

#### Returns

`object`

2 unsigned 53-bit integers, returned as `f64`s
so that the JS runtime converts them to `number`s.

***

### uint64()

```ts
function uint64(): number;
```

Gets this generator's next unsigned 64-bit integer.

Discards the additional random number generated with SIMD.

#### Returns

`number`

An unsigned 64-bit integer.

***

### uint64Array()

```ts
function uint64Array(arr): void;
```

Fills the provided array with this generator's next set of unsigned 64-bit integers.

Utilizes SIMD.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Uint64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### uint64x2()

```ts
function uint64x2(): object;
```

Gets this generator's next 2 unsigned 64-bit integers.

#### Returns

`object`

2 unsigned 64-bit integers.
