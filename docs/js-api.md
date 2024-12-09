# fast-prng-wasm

## Enumerations

### PRNGType

PRNG Algorithm Type

#### Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| `PCG` | `string` | PCG XSH RR |
| `Xoroshiro128Plus` | `string` | Xoroshiro128+ |
| `Xoroshiro128Plus_SIMD` | `string` | Xoroshiro128+ (SIMD-enabled) |
| `Xoshiro256Plus` | `string` | Xoshiro256+ |
| `Xoshiro256Plus_SIMD` | `string` | Xoshiro256+ (SIMD-enabled) |

## Classes

### RandomGenerator

A seedable pseudo random number generator that runs in WebAssembly.

#### Constructors

##### new RandomGenerator()

```ts
new RandomGenerator(
   prngType?, 
   seeds?, 
   jumpCountOrStreamIncrement?, 
   outputArraySize?): RandomGenerator
```

Creates a new WASM pseudo random number generator.

###### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `prngType`? | `any` | `PRNGType.Xoroshiro128Plus_SIMD` | The PRNG algorithm to use. Defaults to Xoroshiro128Plus_SIMD. |
| `seeds`? | `bigint`[] | `null` | Collection of 64-bit integers used to seed the generator. 1-8 seeds are required depending on generator type. Auto-seeds itself if no seeds are provided. |
| `jumpCountOrStreamIncrement`? | `number` \| `bigint` | `0` | Optional - Either: 1. Number of state jumps to make after seeding, which allows Xoshiro generators to choose a unique random stream; Or... 2. For PCG generators, this value is set as the unique steam increment used by the generator, to accomplish the same purpose as the Xoshiro state jumps (chooses a unique random stream). In both cases, this is intended to be used when sharing the same seeds across multiple generators in parallel (e.g. worker threads or distributed computation environments). This number should be unique across generators when `seeds` are shared. |
| `outputArraySize`? | `number` | `1000` | Size of the output array used when fetching arrays from the generator. This size is pre-allocated in WASM memory for performance. Defaults to 1000. |

###### Returns

[`RandomGenerator`](js-api.md#randomgenerator)

#### Accessors

##### outputArraySize

###### Get Signature

```ts
get outputArraySize(): number
```

The size of the array returned by the `nextArray` methods.

###### Returns

`number`

###### Set Signature

```ts
set outputArraySize(newSize): void
```

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `newSize` | `number` |

###### Returns

`void`

##### prngType

###### Get Signature

```ts
get prngType(): any
```

###### Returns

`any`

##### seeds

###### Get Signature

```ts
get seeds(): any
```

###### Returns

`any`

###### Set Signature

```ts
set seeds(newSeeds): void
```

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `newSeeds` | `any` |

###### Returns

`void`

#### Methods

##### batchTestUnitCirclePoints()

```ts
batchTestUnitCirclePoints(pointCount): number
```

Perform a batch test in WASM of random (x, y) points between -1 and 1
and check if they fall within the corresponding unit circle of radius 1.
Useful for Monte Carlo simulation.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pointCount` | `number` | Number of random (x, y) points to generate and test |

###### Returns

`number`

Number of tested points which fall inside of the
unit circle.

##### nextArray\_BigInt()

```ts
nextArray_BigInt(): BigUint64Array<ArrayBufferLike>
```

Get the generator's next set of 64-bit integers between
0 and 2^64 - 1. Array size is set when generator is created, 
or by changing [outputArraySize](js-api.md#outputarraysize).

###### Returns

`BigUint64Array`\<`ArrayBufferLike`\>

An array of 64-bit integers, represented as 
`u64` values in WASM and viewed as unsigned `bigint` values in
JavaScript. This output buffer is reused with each call.

##### nextArray\_Coord()

```ts
nextArray_Coord(): Float64Array<ArrayBufferLike>
```

Get the generator's next set of Float numbers in range (-1, 1).
Array size is set when generator is created, or by changing 
[outputArraySize](js-api.md#outputarraysize). Useful for Monte Carlo simulation.

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of `f64` values in WASM viewed as
`number` values. This output buffer is reused with each call.

##### nextArray\_CoordSquared()

```ts
nextArray_CoordSquared(): Float64Array<ArrayBufferLike>
```

Get the generator's next set of squared Float numbers in range (-1, 1).
Array size is set when generator is created, or by changing 
[outputArraySize](js-api.md#outputarraysize). Useful for Monte Carlo simulation.

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of `f64` values in WASM viewed as
`number` values. This output buffer is reused with each call.

##### nextArray\_Integer()

```ts
nextArray_Integer(): Float64Array<ArrayBufferLike>
```

Get the generator's next set of 53-bit integers between
0 and 2^53 - 1 (i.e. `Number.MAX_SAFE_INTEGER`). Array size is set
when generator is created, or by changing [outputArraySize](js-api.md#outputarraysize).

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of 53-bit integers, represented as
`f64` values in WASM so they can be viewed as `number` values in
JavaScript. This output buffer is reused with each call.

##### nextArray\_Integer32()

```ts
nextArray_Integer32(): Float64Array<ArrayBufferLike>
```

Get the generator's next set of 32-bit integers between
0 and 2^32 - 1. Array size is set when generator is created, 
or by changing [outputArraySize](js-api.md#outputarraysize).

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of 32-bit integers, represented as
`f64` values in WASM so they can be viewed as `number` values in
JavaScript. This output buffer is reused with each call.

##### nextArray\_Number()

```ts
nextArray_Number(): Float64Array<ArrayBufferLike>
```

Get the generator's next set of floating point numbers in range [0, 1).
Array size is set when generator is created, or by changing 
[outputArraySize](js-api.md#outputarraysize).

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of `f64` values in WASM viewed as
`number` values. This output buffer is reused with each call.

##### nextBigInt()

```ts
nextBigInt(): bigint
```

Get the generator's next unsigned 64-bit integer

###### Returns

`bigint`

An unsigned `bigint` providing 64-bits of randomness,
between 0 and 2^64 - 1

##### nextCoord()

```ts
nextCoord(): number
```

Get the generator's next floating point number in range (-1, 1).
Can be considered a "coordinate" in a unit circle. Useful for Monte
Carlo simulation.

###### Returns

`number`

A floating point `number` between -1 and 1

##### nextCoordSquared()

```ts
nextCoordSquared(): number
```

Get the square of the generator's next floating point number in range
(-1, 1). Useful for Monte Carlo simulation.

###### Returns

`number`

A floating point `number` between -1 and 1, multiplied
by itself

##### nextInteger()

```ts
nextInteger(): number
```

Get the generator's next unsigned 53-bit integer

###### Returns

`number`

An unsigned integer `number` providing 53-bits of 
randomness (the most we can fit into a JavaScript `number`), between
0 and 2^53 - 1 (`Number.MAX_SAFE_INTEGER`)

##### nextInteger32()

```ts
nextInteger32(): number
```

Get the generator's next unsigned 32-bit integer

###### Returns

`number`

An unsigned integer `number` providing 32-bits of 
randomness, between 0 and 2^32 - 1

##### nextNumber()

```ts
nextNumber(): number
```

Get the generator's next floating point number in range [0, 1)

###### Returns

`number`

A floating point `number` between 0 and 1

***

### SplitMix64

Splitmix64 is the default pseudo-random number generator algorithm in Java.
It's a good generator for 64 bit seeds. This version is is included for 
seeding the other generators.

Note: This PRNG runs in JS and does not confirm to the same interface 
as the WASM PRNGs.

#### Constructors

##### new SplitMix64()

```ts
new SplitMix64(seed): SplitMix64
```

###### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `seed` | `any` | `null` |

###### Returns

[`SplitMix64`](js-api.md#splitmix64)

#### Methods

##### next()

```ts
next(): bigint
```

###### Returns

`bigint`

## Functions

### seed64Array()

```ts
function seed64Array(count?, seed?): bigint[]
```

Generates an array of random 64-bit integers that are suitable for seeding
various other generators.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `count`? | `number` | `8` | Optional number of seeds to generate. Defaults to 8. |
| `seed`? | `number` \| `bigint` | `null` | Optional seed for the SplitMix64 generator. Auto-seeds itself if no seed is provided. |

#### Returns

`bigint`[]

Array of unique 64-bit seeds.
