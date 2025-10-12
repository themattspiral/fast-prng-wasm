[fast-prng-wasm](../../as-api.md) / PCG

# PCG

An AssemblyScript implementation of the PCG pseudo random number generator,
a 32-bit generator with 64 bits of state and unique stream selection.

## Variables

### SEED\_COUNT

```ts
const SEED_COUNT: i32 = 1;
```

Number of seeds required for this generator's [setSeeds](#setseeds) function.

## Functions

### batchTestUnitCirclePoints()

```ts
function batchTestUnitCirclePoints(count): number;
```

Monte Carlo test: Generates random (x,y) coordinates in range [-1, 1), and
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

Gets this generator's next 53-bit floating point number in range [-1, 1).

Can be considered part of a "coordinate" in a unit circle with radius 1.
Useful for Monte Carlo simulation.

#### Returns

`number`

A 53-bit floating point number in range [-1, 1).

***

### coord53Array()

```ts
function coord53Array(arr): void;
```

Fills the provided array with this generator's next set of 53-bit floating point numbers
in range [-1, 1).

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

Gets the square of this generator's next 53-bit floating point number in range [-1, 1).

Useful for Monte Carlo simulation.

#### Returns

`number`

A 53-bit floating point number in range [-1, 1), multiplied by itself.

***

### coord53SquaredArray()

```ts
function coord53SquaredArray(arr): void;
```

Fills the provided array with the squares of this generator's next set of floating 
point numbers in range [-1, 1).

Useful for Monte Carlo simulation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### float53()

```ts
function float53(): number;
```

Gets this generator's next 53-bit floating point number in range [0, 1).

#### Returns

`number`

A 53-bit floating point number in range [0, 1).

***

### float53Array()

```ts
function float53Array(arr): void;
```

Fills the provided array with this generator's next set of 53-bit floating point numbers
in range [0, 1).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### setSeeds()

```ts
function setSeeds(seed): void;
```

Initializes this generator's internal state with the provided random seed.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | `number` |

#### Returns

`void`

***

### setStreamIncrement()

```ts
function setStreamIncrement(inc): void;
```

Optionally chooses the unique stream to be provided by this generator.

Two generators given the same seed value(s) will still provide a unique stream
of random numbers as long as they use different stream increments.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `inc` | `number` | Any integer. It should be unique amongst stream increments used for other parallel generator instances that have been seeded uniformly. |

#### Returns

`void`

***

### uint32()

```ts
function uint32(): number;
```

Gets this generator's next unsigned 32-bit integer.

#### Returns

`number`

This generator's next unsigned 32-bit integer.

***

### uint32AsFloat()

```ts
function uint32AsFloat(): number;
```

Gets this generator's next unsigned 32-bit integer.

#### Returns

`number`

An unsigned 32-bit integer, returned as an `f64` so that
the JS runtime converts it to a `number`.

***

### uint32AsFloatArray()

```ts
function uint32AsFloatArray(arr): void;
```

Fills the provided array with this generator's next set of unsigned 32-bit integers.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### uint53AsFloat()

```ts
function uint53AsFloat(): number;
```

Gets this generator's next unsigned 53-bit integer.

#### Returns

`number`

This generator's next unsigned 53-bit integer, returned
as an `f64` so that the JS runtime converts it to a `number`.

***

### uint53AsFloatArray()

```ts
function uint53AsFloatArray(arr): void;
```

Fills the provided array with this generator's next set of unsigned 53-bit integers.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`

***

### uint64()

```ts
function uint64(): number;
```

Gets this generator's next unsigned 64-bit integer.

#### Returns

`number`

This generator's next unsigned 64-bit integer.

***

### uint64Array()

```ts
function uint64Array(arr): void;
```

Fills the provided array with this generator's next set of unsigned 64-bit integers.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Uint64Array` | The array to fully fill. If called from a JS runtime, this value should be a pointer to an array that exists in WASM memory. |

#### Returns

`void`
