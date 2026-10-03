type DisplayNamesInstance = { of: (code: string) => string | undefined };
type DisplayNamesPrototype = { of?: DisplayNamesInstance['of']; __gkaisSafeDisplayNames?: boolean };

const intlObject = typeof Intl !== 'undefined' ? Intl as unknown as { DisplayNames?: { prototype?: DisplayNamesPrototype } } : undefined;
const prototype = intlObject?.DisplayNames?.prototype;

if (prototype?.of && !prototype.__gkaisSafeDisplayNames) {
  const originalOf = prototype.of;
  prototype.of = function safeRegionName(this: DisplayNamesInstance, code: string) {
    try {
      return originalOf.call(this, code);
    } catch (error) {
      if (error instanceof RangeError) return code;
      throw error;
    }
  };
  Object.defineProperty(prototype, '__gkaisSafeDisplayNames', { value: true, configurable: false, enumerable: false });
}

export {};
