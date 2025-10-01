[fast-prng-wasm](../as-api.md) / Xoroshiro128Plus

# Xoroshiro128Plus

## Variables

### SEED\_COUNT

```ts
const SEED_COUNT: i32 = 2;
```

## Functions

### batchTestUnitCirclePoints()

```ts
function batchTestUnitCirclePoints(count): i32
```

Monte Carlo test: Count how many random points fall inside a unit circle

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

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

Advances the state by 2^64 steps every call. Can be used to generate 2^64 
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

### nextInt53Number()

```ts
function nextInt53Number(): f64
```

#### Returns

`f64`

***

### nextInt64()

```ts
function nextInt64(): u64
```

#### Returns

`u64`

***

### nextNumber()

```ts
function nextNumber(): f64
```

#### Returns

`f64`

***

### setSeed()

```ts
function setSeed(a, b): void
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `a` | `number` |
| `b` | `number` |

#### Returns

`void`

## References

### allocFloat64Array

Re-exports [allocFloat64Array](PCG.md#allocfloat64array)

### allocUint64Array

Re-exports [allocUint64Array](PCG.md#allocuint64array)

### freeArray

Re-exports [freeArray](PCG.md#freearray)
