[fast-prng-wasm](../as-api.md) / PCG

# PCG

An AssemblyScript implementation of the PCG pseudo random number generator,
a 32-bit generator with 64 bits of state and unique stream selection.

## Variables

### SEED\_COUNT

```ts
const SEED_COUNT: i32 = 1;
```

Number of seed parameters required for this generator's [setSeed](PCG.md#setseed) function.

## Functions

### allocFloat64Array()

```ts
function allocFloat64Array(count): usize
```

Allocates shared WebAssembly memory for a `Float64Array` of the given size, and pins it to
avoid garbage collection. Must be explicitly freed with [freeArray](PCG.md#freearray) if cleanup is needed.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `count` | `number` | The size of the array to allocate (number of `f64`s it can hold). |

#### Returns

`usize`

A pointer to the newly allocated shared-memory array, which can be used from JS runtimes.

***

### allocUint64Array()

```ts
function allocUint64Array(count): usize
```

Allocates shared WebAssembly memory for a `Uint64Array` of the given size, and pins it to
avoid garbage collection. Must be explicitly freed with [freeArray](PCG.md#freearray) if cleanup is needed.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `count` | `number` | The size of the array to allocate (number of `u64`s it can hold). |

#### Returns

`usize`

A pointer to the newly allocated shared-memory array, which can be used from JS runtimes.

***

### batchTestUnitCirclePoints()

```ts
function batchTestUnitCirclePoints(count): i32
```

Monte Carlo test: Generates random (x,y) coordinates in range (-1, 1), and
counts how many of them fall inside the unit circle with radius 1.

Can be used to estimate pi (π).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `count` | `number` | The number of random (x,y) coordinate points in (-1, 1) to generate and check. |

#### Returns

`i32`

The number of random points which fell *inside* of the unit circle with radius 1.

***

### fillFloat64Array\_Coords()

```ts
function fillFloat64Array_Coords(arr): void
```

Fills the provided array with this generator's next set of floating point numbers
in range (-1, 1).

Useful for Monte Carlo simulation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be an array pointer returned by [allocFloat64Array](PCG.md#allocfloat64array). |

#### Returns

`void`

***

### fillFloat64Array\_CoordsSquared()

```ts
function fillFloat64Array_CoordsSquared(arr): void
```

Fills the provided array with the squares of this generator's next set of floating 
point numbers in range (-1, 1).

Useful for Monte Carlo simulation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be an array pointer returned by [allocFloat64Array](PCG.md#allocfloat64array). |

#### Returns

`void`

***

### fillFloat64Array\_Int32Numbers()

```ts
function fillFloat64Array_Int32Numbers(arr): void
```

Fills the provided array with this generator's next set of unsigned 32-bit integers.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be an array pointer returned by [allocFloat64Array](PCG.md#allocfloat64array). |

#### Returns

`void`

***

### fillFloat64Array\_Int53Numbers()

```ts
function fillFloat64Array_Int53Numbers(arr): void
```

Fills the provided array with this generator's next set of unsigned 53-bit integers.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be an array pointer returned by [allocFloat64Array](PCG.md#allocfloat64array). |

#### Returns

`void`

***

### fillFloat64Array\_Numbers()

```ts
function fillFloat64Array_Numbers(arr): void
```

Fills the provided array with this generator's next set of floating point numbers
in range [0, 1).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Float64Array` | The array to fully fill. If called from a JS runtime, this value should be an array pointer returned by [allocFloat64Array](PCG.md#allocfloat64array). |

#### Returns

`void`

***

### fillUint64Array\_Int64()

```ts
function fillUint64Array_Int64(arr): void
```

Fills the provided array with this generator's next set of unsigned 64-bit integers.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arr` | `Uint64Array` | The array to fully fill. If called from a JS runtime, this value should be an array pointer returned by [allocUint64Array](PCG.md#allocuint64array). |

#### Returns

`void`

***

### freeArray()

```ts
function freeArray(arrPtr): void
```

Frees shared WebAssembly memory that was previously allocated by [allocUint64Array](PCG.md#allocuint64array) 
or [allocFloat64Array](PCG.md#allocfloat64array).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arrPtr` | `number` | A pointer to the previously allocated shared-memory array to cleanup. |

#### Returns

`void`

***

### nextCoord()

```ts
function nextCoord(): f64
```

Gets this generator's next floating point number in range (-1, 1).

Can be considered part of a "coordinate" in a unit circle with radius 1.
Useful for Monte Carlo simulation.

#### Returns

`f64`

A floating point number in range (-1, 1).

***

### nextCoordSquared()

```ts
function nextCoordSquared(): f64
```

Gets the square of this generator's next floating point number in range (-1, 1).

Useful for Monte Carlo simulation.

#### Returns

`f64`

A floating point number in range (-1, 1), multiplied by itself.

***

### nextInt32()

```ts
function nextInt32(): u32
```

Gets this generator's next unsigned 32-bit integer.

#### Returns

`u32`

This generator's next unsigned 32-bit integer.

***

### nextInt32Number()

```ts
function nextInt32Number(): f64
```

Gets this generator's next unsigned 32-bit integer.

#### Returns

`f64`

An unsigned 32-bit integer, returned as an `f64` so that
the JS runtime converts it to a `number`.

***

### nextInt53Number()

```ts
function nextInt53Number(): f64
```

Gets this generator's next unsigned 53-bit integer.

#### Returns

`f64`

This generator's next unsigned 53-bit integer, returned
as an `f64` so that the JS runtime converts it to a `number`.

***

### nextInt64()

```ts
function nextInt64(): u64
```

Gets this generator's next unsigned 64-bit integer.

#### Returns

`u64`

This generator's next unsigned 64-bit integer.

***

### nextNumber()

```ts
function nextNumber(): f64
```

Gets this generator's next floating point number in range [0, 1).

#### Returns

`f64`

A floating point number in range [0, 1).

***

### setSeed()

```ts
function setSeed(seed): void
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
function setStreamIncrement(inc): void
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
