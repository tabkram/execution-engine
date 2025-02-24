import { extract, queryByXPath } from './jsonQuery';

describe('JsonQueryServiceTests', () => {
  const json1 = {
    parameter: 'param1',
    inputs: [
      { key: 'country', value: 'US' },
      { key: 'langage', value: 'en' },
      { key: 'name', value: 'John' }
    ],
    outputs: [
      { key: 'population', value: 200 },
      { key: 'age', value: 2 }
    ]
  };

  const json2 = {
    parameter: 'param2',
    inputs: [{ key: 'country', value: 'France' }],
    outputs: [
      { key: 'value', value: 50000 },
      { key: 'value2', value: 200000 },
      { key: 'currency', value: 'EUR' }
    ]
  };

  const json3 = {
    parameter: 'param2',
    inputs: [{ key: 'country', value: 'US' }],
    outputs: [
      { key: 'value', value: 1000 },
      { key: 'value3', value: 2000 },
      { key: 'currency', value: 'EUR' }
    ]
  };

  it('Test on real config', async () => {
    const res0 = queryByXPath(json1, 'parameter');
    expect(res0).toEqual('param1');

    const res1 = queryByXPath(json1, 'inputs[key = country].value');
    expect(res1).toEqual('US');

    const res2 = queryByXPath(json1, 'outputs [  key = population  ] . value');
    expect(res2).toEqual(200);
  });

  it('Test on array of config', async () => {
    const array = [json1, json2, json3];
    const res0 = queryByXPath(array, 'parameter', { searchInArrayElements: 'FIRST' });
    expect(res0).toEqual('param1');

    const res1 = queryByXPath(array, 'inputs[key = country].value', { searchInArrayElements: 'FIRST' });
    expect(res1).toEqual('US');

    const res2 = queryByXPath(array, 'outputs[key=population].value', { searchInArrayElements: 'FIRST' });
    expect(res2).toEqual(200);
  });

  it('Test on array of adt config with global boolean', async () => {
    const array = [json1, json2, json3];
    const res0 = queryByXPath(array, 'parameter', { searchInArrayElements: 'ALL' }) as Array<unknown>;
    expect(res0?.length).toEqual(3);
    expect(res0).toMatchObject(['param1', 'param2', 'param2']);
    const res1 = queryByXPath(array, 'inputs[key = country].value', { searchInArrayElements: 'ALL' }) as Array<unknown>;
    expect(res1?.length).toEqual(3);
    expect(res1).toMatchObject(['US', 'France', 'US']);
    const res2 = queryByXPath(array, 'outputs[key=population].value', { searchInArrayElements: 'ALL' });
    expect(res2).toMatchObject([200]);
  });

  it('Test extract', async () => {
    const extraction = extract(
      {
        inputs: {
          ratio: 0.12,
          number: 3
        },
        outputs: {
          color: 'America',
          others: [
            {
              key: 'O',
              value: 'ORANGE'
            },
            {
              key: 'Y',
              value: 'YELLOW'
            },
            {
              key: 'R',
              value: 'RED'
            }
          ]
        },
        parent: 'handler'
      },
      ['inputs.number', 'parent', 'outputs.others.2.key', 'outputs.others[key=Y].value']
    );
    expect(extraction.length).toEqual(4);
    expect(extraction?.[0]?.['inputs.number']).toEqual(3);
    expect(extraction?.[1]?.['parent']).toEqual('handler');
    expect(extraction?.[2]?.['outputs.others.2.key']).toEqual('R');
    expect(extraction?.[3]?.['outputs.others[key=Y].value']).toEqual('YELLOW');
  });
});
