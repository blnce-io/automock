import {
  Bar,
  Foo,
  Logger,
  NestJSTestClass,
  TestClassOne,
  TestClassThree,
  TestClassTwo,
} from './spec-assets';
import { TestBed, UnitTestBed, TestBedResolver } from '../src';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('AutoMock NestJS E2E Test', () => {
  let unit: UnitTestBed<NestJSTestClass>;
  let unitResolver: TestBedResolver<NestJSTestClass>;

  describe('given a unit testing builder with two overrides', () => {
    beforeAll(() => {
      unitResolver = TestBed.create<NestJSTestClass>(NestJSTestClass)
        .mock(TestClassOne)
        .using({
          async foo(): Promise<string> {
            return 'foo-from-test';
          },
        })
        .mock<Logger>('LOGGER')
        .using({
          log() {
            return 'baz-from-test';
          },
        });
    });

    describe('when compiling the builder and turning into testing unit', () => {
      beforeAll(() => (unit = unitResolver.compile()));

      test('then return an actual instance of the injectable class', () => {
        expect(unit).toHaveProperty('unit');
        expect(unit.unit).toBeInstanceOf(NestJSTestClass);
      });

      test('then successfully resolve the dependencies of the tested classes', () => {
        const { unitRef } = unit;

        expect(unitRef.get(TestClassOne)).toBeDefined();
        expect(unitRef.get(TestClassTwo)).toBeDefined();
        expect(unitRef.get(getRepositoryToken(Foo) as string)).toBeDefined();
        expect(unitRef.get(getRepositoryToken(Bar) as string)).toBeDefined();
        expect(unitRef.get('LOGGER')).toBeDefined();
        expect(unitRef.get(TestClassThree)).toBeDefined();
      });

      test('then do not return the actual reflected dependencies of the injectable class', () => {
        // Indeed, they all need to be overwritten
        const { unitRef } = unit;

        expect(unitRef.get(TestClassOne)).not.toBeInstanceOf(TestClassOne);
        expect(unitRef.get(TestClassTwo)).not.toBeInstanceOf(TestClassTwo);
      });

      test('then hard-mock the implementation of TestClassOne using the "foo" (partial impl function)', async () => {
        const { unitRef } = unit;
        const testClassOne = unitRef.get(TestClassOne);
        const logger = unitRef.get<Logger>('LOGGER');

        // The original 'foo' method in TestClassOne return value should be changed
        // according to the passed flag; here, always return the same value
        // because we mock the implementation of foo permanently
        await expect(testClassOne.foo(true)).resolves.toBe('foo-from-test');
        await expect(testClassOne.foo(false)).resolves.toBe('foo-from-test');

        expect(logger.log).toBeDefined();
      });

      test('then all the un-override classes/dependencies should be stubs', () => {
        const { unitRef } = unit;
        const testClassTwo: jest.Mocked<TestClassTwo> = unitRef.get(TestClassTwo);

        expect(testClassTwo.bar.getMockName).toBeDefined();
        expect(testClassTwo.bar.getMockName()).toBe('jest.fn()');
      });
    });
  });
});
