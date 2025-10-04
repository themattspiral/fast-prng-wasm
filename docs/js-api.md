# fast-prng-wasm

JavaScript API - Can be used within any environment that supports WebAssembly,
(e.g. most modern browsers and Node runtimes).

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

Creates a WASM pseudo random number generator.

###### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `prngType`? | `any` | `PRNGType.Xoroshiro128Plus_SIMD` | The PRNG algorithm to use. Defaults to Xoroshiro128Plus_SIMD. |
| `seeds`? | `bigint`[] | `null` | Collection of 64-bit integers used to seed the generator. 1-8 seeds are required depending on generator type (see [seedCount](js-api.md#seedcount) or API docs to determine the required seed count). Auto-seeds itself if no seeds are provided. |
| `jumpCountOrStreamIncrement`? | `number` \| `bigint` | `0` | Optional unique identifier to be used when sharing the same seeds across multiple parallel generators (e.g. worker threads or distributed computation), allowing each to choose a unique random stream. For Xoshiro generators, this value indicates the number of state jumps to make after seeding. For PCG generators, this value is used as the internal stream increment for state advances and must be odd. |
| `outputArraySize`? | `number` | `1000` | Size of the output array used when filling shared memory using the `nextArray` methods. Defaults to 1000. |

###### Returns

[`RandomGenerator`](js-api.md#randomgenerator)

#### Accessors

##### outputArraySize

###### Get Signature

```ts
get outputArraySize(): number
```

Gets the size of the array returned by the `nextArray` methods.

###### Returns

`number`

The integer `number` of items returned by the `nextArray` methods.

###### Set Signature

```ts
set outputArraySize(newSize): void
```

Changes the size of the array returned by the `nextArray` methods.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `newSize` | `number` | The integer `number` of items to be returned by the `nextArray` methods. |

###### Returns

`void`

##### prngType

###### Get Signature

```ts
get prngType(): any
```

Gets the PRNG algorithm being used by this generator instance.

###### Returns

`any`

The [PRNGType](js-api.md#prngtype) being used by this generator instance.

##### seedCount

###### Get Signature

```ts
get seedCount(): any
```

Gets the number of `bigint`s required to seed this generator instance.

###### Returns

`any`

The integer `number` of `bigint`s required to seed this generator instance.

##### seeds

###### Get Signature

```ts
get seeds(): bigint[]
```

Gets the seed collection used to initialize this generator instance.

###### Returns

`bigint`[]

The `bigint[]` seed collection used to initialize this generator instance.

###### Set Signature

```ts
set seeds(newSeeds): void
```

Re-initializes the internal state of this generator instance with the given seeds.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `newSeeds` | `bigint`[] | Collection of 64-bit integers used to seed the generator. |

###### Returns

`void`

#### Methods

##### batchTestUnitCirclePoints()

```ts
batchTestUnitCirclePoints(pointCount): number
```

Performs a batch test in WASM of random (x, y) points between -1 and 1
and check if they fall within the corresponding unit circle with radius 1.

Useful for Monte Carlo simulation.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pointCount` | `number` | Number of random (x, y) points in (-1, 1) to generate and check. |

###### Returns

`number`

Number of tested points which fell *inside* of the
unit circle with radius 1.

##### nextArray\_BigInt()

```ts
nextArray_BigInt(): BigUint64Array<ArrayBufferLike>
```

Gets this generator's next set of 64-bit integers.

Array size is set when generator is created, or by changing [outputArraySize](js-api.md#outputarraysize).

###### Returns

`BigUint64Array`\<`ArrayBufferLike`\>

An array of 64-bit integers, represented as 
`u64` values in WASM and viewed as unsigned `bigint` values in
JavaScript. This output buffer is reused with each call.

##### nextArray\_Coord()

```ts
nextArray_Coord(): Float64Array<ArrayBufferLike>
```

Gets this generator's next set of Float numbers in range (-1, 1).

Array size is set when generator is created, or by changing [outputArraySize](js-api.md#outputarraysize).

Useful for Monte Carlo simulation.

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of `f64` values from WASM viewed as
`number` values in JS runtimes.

This output buffer is reused with each call.

##### nextArray\_CoordSquared()

```ts
nextArray_CoordSquared(): Float64Array<ArrayBufferLike>
```

Gets this generator's next set of squared Float numbers in range (-1, 1).

Array size is set when generator is created, or by changing [outputArraySize](js-api.md#outputarraysize).

Useful for Monte Carlo simulation.

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of `f64` values from WASM viewed as
`number` values in JS runtimes.

This output buffer is reused with each call.

##### nextArray\_Integer()

```ts
nextArray_Integer(): Float64Array<ArrayBufferLike>
```

Gets this generator's next set of 53-bit integers.

Array size is set when generator is created, or by changing [outputArraySize](js-api.md#outputarraysize).

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of 53-bit integers, represented as
`f64` values in WASM so they can be viewed as `number` values in
JavaScript. This output buffer is reused with each call.

##### nextArray\_Integer32()

```ts
nextArray_Integer32(): Float64Array<ArrayBufferLike>
```

Gets this generator's next set of 32-bit integers.

Array size is set when generator is created, or by changing [outputArraySize](js-api.md#outputarraysize).

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of 32-bit integers, represented as
`f64` values in WASM so they can be viewed as `number` values in JS runtimes.

This output buffer is reused with each call.

##### nextArray\_Number()

```ts
nextArray_Number(): Float64Array<ArrayBufferLike>
```

Gets this generator's next set of floating point numbers in range [0, 1).

Array size is set when generator is created, or by changing [outputArraySize](js-api.md#outputarraysize).

###### Returns

`Float64Array`\<`ArrayBufferLike`\>

An array of `f64` values from WASM viewed as
`number` values in JS runtimes.

This output buffer is reused with each call.

##### nextBigInt()

```ts
nextBigInt(): bigint
```

Gets this generator's next unsigned 64-bit integer.

###### Returns

`bigint`

An unsigned 64-bit integer as a `bigint`,
providing 64-bits of randomness, between 0 and 2^64 - 1

##### nextCoord()

```ts
nextCoord(): number
```

Gets this generator's next floating point number in range (-1, 1).

Can be considered part of a "coordinate" in a unit circle with radius 1.
Useful for Monte Carlo simulation.

###### Returns

`number`

A floating point `number` between -1 and 1

##### nextCoordSquared()

```ts
nextCoordSquared(): number
```

Gets the square of this generator's next floating point number in range
(-1, 1).

Useful for Monte Carlo simulation.

###### Returns

`number`

A floating point `number` between -1 and 1, multiplied
by itself

##### nextInteger()

```ts
nextInteger(): number
```

Gets this generator's next unsigned 53-bit integer.

###### Returns

`number`

An unsigned 53-bit integer `number` providing 53-bits of 
randomness (the most we can fit into a JavaScript `number` type), between
0 and 2^53 - 1 (aka `Number.MAX_SAFE_INTEGER`)

##### nextInteger32()

```ts
nextInteger32(): number
```

Gets this generator's next unsigned 32-bit integer.

###### Returns

`number`

An unsigned 32-bit integer `number` providing 32-bits of 
randomness, between 0 and 2^32 - 1

##### nextNumber()

```ts
nextNumber(): number
```

Gets this generator's next floating point number in range [0, 1).

###### Returns

`number`

A floating point `number` between 0 and 1

***

### SplitMix64

Splitmix64 is the default pseudo random number generator algorithm in Java.
It's a good generator for 64 bit seeds, and is is included for seeding
the other generators within this package.

Note: This PRNG runs only in JS and does not conform to the same interface 
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
the other generators in this library.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `count`? | `number` | `8` | Optional number of seeds to generate. Defaults to 8. |
| `seed`? | `number` \| `bigint` | `null` | Optional seed for the SplitMix64 generator. Auto-seeds itself if not provided using a combination of the current time Math.random(). |

#### Returns

`bigint`[]

Array of unique 64-bit seeds.
