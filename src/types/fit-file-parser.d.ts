declare module 'fit-file-parser' {
  interface FitParserOptions {
    force?: boolean
    speedUnit?: 'km/h' | 'm/s' | 'mph'
    lengthUnit?: 'km' | 'm' | 'mi'
    temperatureUnit?: 'celsius' | 'fahrenheit' | 'kelvin'
    elapsedRecordField?: boolean
    mode?: 'list' | 'cascade' | 'both'
  }

  class FitParser {
    constructor(options?: FitParserOptions)
    parse(buffer: Buffer, callback: (error: Error | null, data: unknown) => void): void
  }

  export default FitParser
}
