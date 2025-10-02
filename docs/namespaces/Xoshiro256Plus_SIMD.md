[fast-prng-wasm](../as-api.md) / Xoshiro256Plus\_SIMD

# Xoshiro256Plus\_SIMD

An AssemblyScript implementation of the Xoshiro256+ PRNG, a 64-bit generator
with 256 bits of state (2^256 period) and a jump function for unique sequence selection.

This version supports WebAssembly SIMD to provide 2 random outputs for the price of 1.

## Variables

### SEED\_COUNT

```ts
const SEED_COUNT: i32 = 8;
```

## Functions

### batchTestUnitCirclePoints()

```ts
function batchTestUnitCirclePoints(pointCount): i32
```

Monte Carlo test: Count how many random points fall inside a unit circle

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `pointCount` | `number` |

#### Returns

`i32`

***

### fillFloat64Array\_Coords()

```ts
function fillFloat64Array_Coords(arr): void
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arr` | `Float64Array` |

#### Returns

`void`

***

### fillFloat64Array\_CoordsSquared()

```ts
function fillFloat64Array_CoordsSquared(arr): void
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arr` | `Float64Array` |

#### Returns

`void`

***

### fillFloat64Array\_Int32Numbers()

```ts
function fillFloat64Array_Int32Numbers(arr): void
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arr` | `Float64Array` |

#### Returns

`void`

***

### fillFloat64Array\_Int53Numbers()

```ts
function fillFloat64Array_Int53Numbers(arr): void
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arr` | `Float64Array` |

#### Returns

`void`

***

### fillFloat64Array\_Numbers()

```ts
function fillFloat64Array_Numbers(arr): void
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arr` | `Float64Array` |

#### Returns

`void`

***

### fillUint64Array\_Int64()

```ts
function fillUint64Array_Int64(arr): void
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arr` | `Uint64Array` |

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

#### Returns

`f64`

***

### nextCoordSquared()

```ts
function nextCoordSquared(): f64
```

#### Returns

`f64`

***

### nextInt32Number()

```ts
function nextInt32Number(): f64
```

#### Returns

`f64`

***

### nextInt32x2()

```ts
function nextInt32x2(): v128
```

#### Returns

`v128`

***

### nextInt53Number()

```ts
function nextInt53Number(): f64
```

#### Returns

`f64`

***

### nextInt53x2()

```ts
function nextInt53x2(): v128
```

No runtime function call penalty is incurred here because 
we inline and optimize the build at compile time.

#### Returns

`v128`

***

### nextInt64()

```ts
function nextInt64(): u64
```

#### Returns

`u64`

***

### nextInt64x2()

```ts
function nextInt64x2(): v128
```

#### Returns

`v128`

***

### nextNumber()

```ts
function nextNumber(): f64
```

#### Returns

`f64`

***

### nextNumbers()

```ts
function nextNumbers(): v128
```

#### Returns

`v128`

***

### nextPoint()

```ts
function nextPoint(): v128
```

#### Returns

`v128`

***

### nextPointSquared()

```ts
function nextPointSquared(): v128
```

#### Returns

`v128`

***

### setSeed()

```ts
function setSeed(
   a, 
   b, 
   c, 
   d, 
   e, 
   f, 
   g, 
   h): void
```

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

## References

### allocFloat64Array

Re-exports [allocFloat64Array](PCG.md#allocfloat64array)

### allocUint64Array

Re-exports [allocUint64Array](PCG.md#allocuint64array)

### freeArray

Re-exports [freeArray](PCG.md#freearray)
