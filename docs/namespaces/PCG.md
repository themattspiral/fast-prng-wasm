[fast-prng-wasm](../as-api.md) / PCG

# PCG

This is the PCG PRNG. Let's see it in action, eh?

## Variables

### SEED\_COUNT

```ts
const SEED_COUNT: i32 = 1;
```

## Functions

### allocFloat64Array()

```ts
function allocFloat64Array(count): usize
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`usize`

***

### allocUint64Array()

```ts
function allocUint64Array(count): usize
```

These functions are compatible with AssemblyScript's "incremental" runtime,
and explicitly __pin()s the newly allocated array so that the built-in GC 
won't collect the array when WASM doesn't see it in-scope after returning.

If using a runtime that doesn't garbage collect, eg. project-default "stub",
then __pin isn't required, but will have no effect, so it's safe to call.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`usize`

***

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

### freeArray()

```ts
function freeArray(arrPtr): void
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arrPtr` | `number` |

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

### nextInt32()

```ts
function nextInt32(): u32
```

Main PCG state advancement / generator function.

#### Returns

`u32`

This generator's next unsigned 32-bit integer.

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

Chain two u32s together to get a u64.

#### Returns

`u64`

This generator's next unsigned 64-bit integer.

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
function setSeed(seed): void
```

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

Choose the unique stream to be provided by this generator.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `inc` | `number` | Any integer, provided it is unique amongst stream increments used for other generator instances, if you want them to remain unique. |

#### Returns

`void`
