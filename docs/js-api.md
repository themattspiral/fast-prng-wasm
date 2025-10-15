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
   uniqueStreamId, 
   outputArraySize): RandomGenerator;
```

Creates a WASM pseudo random number generator.

###### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `prngType` | [`PRNGType`](#prngtype) | `PRNGType.Xoroshiro128Plus_SIMD` | The PRNG algorithm to use. Defaults to Xoroshiro128Plus_SIMD. |
| `seeds` | `bigint`[] \| `null` | `null` | Collection of 64-bit integers used to initialize this generator's internal state. 1-8 seeds are required depending on generator type (see [seedCount](#seedcount) or API docs to determine the required seed count). <br><br> Auto-seeds itself if no seeds are provided. |
| `uniqueStreamId` | `number` \| `bigint` \| `null` | `null` | Determines the unique random stream this generator will return within its period, given a particular starting state. Values <= 0, `null`, or `undefined` will select the default stream. <br><br> This optional unique identifier should be used when sharing the same seeds across parallel generator instances, so that each can provide a unique random stream. <br><br> For Xoshiro generators, this value indicates the number of state jumps to make after seeding. For PCG generators, this value is used as the internal stream increment for state advances. |
| `outputArraySize` | `number` | `1000` | Size of the output arrays used when filling WASM memory buffer using the `*Array()` methods (default: 1000). This value is immutable after construction due to intentional WASM memory constraints. Larger sizes provide no performance benefit. |

###### Returns

[`RandomGenerator`](#randomgenerator)

#### Accessors

##### outputArraySize

###### Get Signature

```ts
get outputArraySize(): number;
```

Gets the size of the array populated by the `*Array()` methods (default: 1000).
This value is immutable after construction due to intentional WASM memory constraints.

To use a different array size, create a new generator instance.

###### Returns

`number`

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

Seeds are immutable after construction. To use different seeds,
create a new generator instance.

###### Returns

`bigint`[]

#### Methods

##### batchTestUnitCirclePoints()

```ts
batchTestUnitCirclePoints(pointCount): number;
```

Performs a batch test entirely in WASM by generating random (x, y) coordinate pairs
between -1 and 1 (in a unit square), and checks if they fall within the corresponding
unit circle with radius 1.

Useful for Monte Carlo simulation.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pointCount` | `number` | Number of random points in (-1, 1) to generate and test. |

###### Returns

`number`

Number of random points in (-1, 1) which fell *inside* of the
unit circle with radius 1.

##### coord()

```ts
coord(): number;
```

Gets this generator's next 53-bit floating point number in range [-1, 1).

Can be used as part of a coordinate pair in a unit square with radius 1.
Useful for Monte Carlo simulation.

###### Returns

`number`

A 53-bit float between -1 and 1. This provides the maximum 
randomness that can fit into a JavaScript `number` type.

##### coordArray()

```ts
coordArray(): Float64Array;
```

Fills WASM memory array with this generator's next set of floats in range [-1, 1).

Array size is set when generator is created.

Can be used as part of a coordinate pair in a unit square with radius 1.
Useful for Monte Carlo simulation.

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### coordSquared()

```ts
coordSquared(): number;
```

Gets the square of this generator's next 53-bit floating point number in range [-1, 1).

Can be used as part of a coordinate pair in a unit square with radius 1,
already squared to speed up testing for unit circle inclusion.
Useful for Monte Carlo simulation.

###### Returns

`number`

A 53-bit float (providing the maximum randomness
that can fit into a JavaScript `number` type) between -1 and 1,
multiplied by itself

##### coordSquaredArray()

```ts
coordSquaredArray(): Float64Array;
```

Fills WASM memory array with this generator's next set of floats in range [-1, 1)
that have been squared.

Array size is set when generator is created.

Can be used as part of a coordinate pair in a unit square with radius 1,
already squared to speed up testing for unit circle inclusion.
Useful for Monte Carlo simulation.

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### float()

```ts
float(): number;
```

Gets this generator's next 53-bit floating point number in range [0, 1).

###### Returns

`number`

A 53-bit float between 0 and 1. This provides the maximum 
randomness that can fit into a JavaScript `number` type, as a float.

##### floatArray()

```ts
floatArray(): Float64Array;
```

Fills WASM memory array with this generator's next set of floats in range [0, 1).

Array size is set when generator is created.

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### int32()

```ts
int32(): number;
```

Gets this generator's next unsigned 32-bit integer.

###### Returns

`number`

An unsigned 32-bit integer between 0 and 2^32 - 1.

##### int32Array()

```ts
int32Array(): Float64Array;
```

Fills WASM memory array with this generator's next set of unsigned 32-bit integers.

Array size is set when generator is created.

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### int53()

```ts
int53(): number;
```

Gets this generator's next unsigned 53-bit integer.

###### Returns

`number`

An unsigned 53-bit integer between 0 and 2^53 - 1
(aka `Number.MAX_SAFE_INTEGER`). This provides the maximum randomness
that can fit into a JavaScript `number` type, which is limited to
53 bits.

##### int53Array()

```ts
int53Array(): Float64Array;
```

Fills WASM memory array with this generator's next set of unsigned 53-bit integers.

Array size is set when generator is created.

###### Returns

`Float64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

##### int64()

```ts
int64(): bigint;
```

Gets this generator's next unsigned 64-bit integer.

###### Returns

`bigint`

An unsigned 64-bit integer between 0 and 2^64 - 1.

##### int64Array()

```ts
int64Array(): BigUint64Array;
```

Fills WASM memory array with this generator's next set of unsigned 64-bit integers.

Array size is set when generator is created.

###### Returns

`BigUint64Array`

View of the array in WASM memory for this generator, now refilled.
This output buffer is reused with each call.

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
| `seed` | `number` \| `bigint` \| `null` | `null` |

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
| `seed` | `number` \| `bigint` \| `null` | `null` | Seed for SplitMix64 generator initialization. If not provided, will auto-seed using a combination of the current time and Math.random(). |

#### Returns

`bigint`[]

Array of unique 64-bit seeds.
