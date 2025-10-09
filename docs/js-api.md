# fast-prng-wasm

PRNG JavaScript/TypeScript API - Can be used from most modern environments
that support WebAssembly. See project README for compatability details.

This wrapper around the WebAssembly PRNGs simplifies WASM usage and makes 
them thread safe from the JS runtime by allowing for separate WASM instances.

## Enumerations

### PRNGType

PRNG Algorithm Type

#### Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| <a id="pcg"></a> `PCG` | `"PCG"` | PCG XSH RR |
| <a id="xoroshiro128plus"></a> `Xoroshiro128Plus` | `"Xoroshiro128Plus"` | Xoroshiro128+ |
| <a id="xoroshiro128plus_simd"></a> `Xoroshiro128Plus_SIMD` | `"Xoroshiro128Plus_SIMD"` | Xoroshiro128+ (SIMD-enabled) |
| <a id="xoshiro256plus"></a> `Xoshiro256Plus` | `"Xoshiro256Plus"` | Xoshiro256+ |
| <a id="xoshiro256plus_simd"></a> `Xoshiro256Plus_SIMD` | `"Xoshiro256Plus_SIMD"` | Xoshiro256+ (SIMD-enabled) |

## Classes

### RandomGenerator

A seedable pseudo random number generator that runs in WebAssembly.

#### Constructors

##### Constructor

```ts
new RandomGenerator(
   prngType, 
   seeds, 
   jumpCountOrStreamIncrement, 
   outputArraySize): RandomGenerator;
```

Creates a WASM pseudo random number generator.

###### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `prngType` | [`PRNGType`](#prngtype) | `PRNGType.Xoroshiro128Plus_SIMD` | The PRNG algorithm to use. Defaults to Xoroshiro128Plus_SIMD. |
| `seeds` | `null` \| `bigint`[] | `null` | Collection of 64-bit integers used to initialize this generator's internal state. 1-8 seeds are required depending on generator type (see [seedCount](#seedcount) or API docs to determine the required seed count). <br><br> Auto-seeds itself if no seeds are provided. |
| `jumpCountOrStreamIncrement` | `null` \| `number` \| `bigint` | `null` | Determines the unique random stream this generator will return within its period, given a particular starting state. Values <= 0, `null`, or `undefined` will select the default stream. <br><br> This optional unique identifier should be used when sharing the same seeds across parallel generator instances, so that each can provide a unique random stream. <br><br> For Xoshiro generators, this value indicates the number of state jumps to make after seeding. For PCG generators, this value is used as the internal stream increment for state advances. |
| `outputArraySize` | `number` | `1000` | Size of the output array used when filling WASM memory buffer using the `nextArray` methods. |

###### Returns

[`RandomGenerator`](#randomgenerator)

#### Accessors

##### outputArraySize

###### Get Signature

```ts
get outputArraySize(): number;
```

Gets the size of the array populated by the `nextArray` methods.

###### Returns

`number`

###### Set Signature

```ts
set outputArraySize(newSize): void;
```

Changes the size of the array populated by the `nextArray` methods.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `newSize` | `number` | The count of items to be populated by the `nextArray` methods. |

###### Returns

`void`

##### prngType

###### Get Signature

```ts
get prngType(): PRNGType;
```

Gets the PRNG algorithm being used by this generator instance.

###### Returns

[`PRNGType`](#prngtype)

##### seedCount

###### Get Signature

```ts
get seedCount(): number;
```

Gets the number of `bigint`s required to seed this generator instance.

###### Returns

`number`

##### seeds

###### Get Signature

```ts
get seeds(): bigint[];
```

Gets the seed collection used to initialize this generator instance.

###### Returns

`bigint`[]

###### Set Signature

```ts
set seeds(newSeeds): void;
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
batchTestUnitCirclePoints(pointCount): number;
```

Performs a batch test in WASM of random (x, y) points between -1 and 1
and checks if they fall within the corresponding unit circle with radius 1.

Useful for Monte Carlo simulation.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pointCount` | `number` | Number of random (x, y) points in (-1, 1) to generate and test. |

###### Returns

`number`

Number of random points in (-1, 1) which fell *inside* of the
unit circle with radius 1.

##### nextArray\_BigInt()

```ts
nextArray_BigInt(): BigUint64Array;
```

Fills WASM memory array with this generator's next set of unsigned 64-bit integers.

Array size is set when generator is created or by changing [outputArraySize](#outputarraysize).

###### Returns

`BigUint64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### nextArray\_Coord()

```ts
nextArray_Coord(): Float64Array;
```

Fills WASM memory array with this generator's next set of floats in range (-1, 1).

Array size is set when generator is created or by changing [outputArraySize](#outputarraysize).

Useful for Monte Carlo simulation.

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### nextArray\_CoordSquared()

```ts
nextArray_CoordSquared(): Float64Array;
```

Fills WASM memory array with this generator's next set of floats in range (-1, 1)
that have been squared.

Array size is set when generator is created or by changing [outputArraySize](#outputarraysize).

Useful for Monte Carlo simulation.

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### nextArray\_Integer()

```ts
nextArray_Integer(): Float64Array;
```

Fills WASM memory array with this generator's next set of 53-bit integers.

Array size is set when generator is created or by changing [outputArraySize](#outputarraysize).

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### nextArray\_Integer32()

```ts
nextArray_Integer32(): Float64Array;
```

Fills WASM memory array with this generator's next set of 32-bit integers.

Array size is set when generator is created or by changing [outputArraySize](#outputarraysize).

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### nextArray\_Number()

```ts
nextArray_Number(): Float64Array;
```

Fills WASM memory array with this generator's next set of floats in range [0, 1).

Array size is set when generator is created or by changing [outputArraySize](#outputarraysize).

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### nextBigInt()

```ts
nextBigInt(): bigint;
```

Gets this generator's next unsigned 64-bit integer.

###### Returns

`bigint`

An unsigned 64-bit integer,
providing 64-bits of randomness, between 0 and 2^64 - 1

##### nextCoord()

```ts
nextCoord(): number;
```

Gets this generator's next floating point number in range (-1, 1).

Can be considered part of a "coordinate" in a unit circle with radius 1.
Useful for Monte Carlo simulation.

###### Returns

`number`

A 53-bit float (providing the maximum randomness
that can fit into a JavaScript `number` type) between -1 and 1

##### nextCoordSquared()

```ts
nextCoordSquared(): number;
```

Gets the square of this generator's next floating point number in range (-1, 1).

Useful for Monte Carlo simulation.

###### Returns

`number`

A 53-bit float (providing the maximum randomness
that can fit into a JavaScript `number` type) between -1 and 1,
multiplied by itself

##### nextInteger()

```ts
nextInteger(): number;
```

Gets this generator's next unsigned 53-bit integer.

###### Returns

`number`

An unsigned 53-bit integer (providing the maximum randomness
that can fit into a JavaScript `number` type) between
0 and 2^53 - 1 (aka `Number.MAX_SAFE_INTEGER`)

##### nextInteger32()

```ts
nextInteger32(): number;
```

Gets this generator's next unsigned 32-bit integer.

###### Returns

`number`

An unsigned 32-bit integer providing 32-bits of 
randomness, between 0 and 2^32 - 1

##### nextNumber()

```ts
nextNumber(): number;
```

Gets this generator's next 53-bit floating point number in range [0, 1).

###### Returns

`number`

A 53-bit float (providing the maximum randomness
that can fit into a JavaScript `number` type) between 0 and 1

***

### SplitMix64

Splitmix64 is the default pseudo random number generator algorithm in Java.
It's a good generator for 64 bit seeds, and is is included for seeding
the other generators within this library.

#### Constructors

##### Constructor

```ts
new SplitMix64(seed): SplitMix64;
```

###### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `seed` | `null` \| `number` \| `bigint` | `null` |

###### Returns

[`SplitMix64`](#splitmix64)

#### Properties

| Property | Type |
| ------ | ------ |
| <a id="_state"></a> `_state` | `bigint` |

#### Methods

##### next()

```ts
next(): bigint;
```

###### Returns

`bigint`

## Functions

### seed64Array()

```ts
function seed64Array(count, seed): bigint[];
```

Generates an array of random 64-bit integers suitable for seeding
the other generators in this library.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `count` | `number` | `8` | Number of random seeds to generate. |
| `seed` | `null` \| `number` \| `bigint` | `null` | Seed for SplitMix64 generator initialization. If not provided, will auto-seed using a combination of the current time and Math.random(). |

#### Returns

`bigint`[]

Array of unique 64-bit seeds.
