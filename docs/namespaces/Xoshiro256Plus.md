[fast-prng-wasm](../as-api.md) / Xoshiro256Plus

# Xoshiro256Plus

An AssemblyScript implementation of the Xoshiro256+ pseudo random number generator,
a 64-bit generator with 256 bits of state (2^256 period) and a jump function for
unique sequence selection.

## Variables

### SEED\_COUNT

```ts
const SEED_COUNT: i32 = 4;
```

Number of seed parameters required for this generator's [setSeed](Xoshiro256Plus.md#setseed) function.

## Functions

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

### jump()

```ts
function jump(): void
```

Advances the state by 2^128 steps every call. Can be used to generate 2^128
non-overlapping subsequences (with the same seed) for parallel computations.

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

### nextInt32Number()

```ts
function nextInt32Number(): f64
```

Gets this generator's next unsigned 32-bit integer.

#### Returns

`f64`

This generator's next unsigned 32-bit integer, returned
as an f64 so that the JS runtime converts it to a `Number`.

***

### nextInt53Number()

```ts
function nextInt53Number(): f64
```

Gets this generator's next unsigned 53-bit integer.

#### Returns

`f64`

This generator's next unsigned 53-bit integer, returned
as an f64 so that the JS runtime converts it to a `Number`.

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
function setSeed(
   a, 
   b, 
   c, 
   d): void
```

Initializes this generator's internal state with the provided random seeds.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `a` | `number` |
| `b` | `number` |
| `c` | `number` |
| `d` | `number` |

#### Returns

`void`

## References

### allocFloat64Array

Re-exports [allocFloat64Array](PCG.md#allocfloat64array)

### allocUint64Array

Re-exports [allocUint64Array](PCG.md#allocuint64array)

### freeArray

Re-exports [freeArray](PCG.md#freearray)
