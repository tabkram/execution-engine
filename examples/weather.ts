import { engine, EngineTask, run } from '../src';
import { writeTrace } from './common/writeTrace';

@engine({ id: 'whetherEngine' })
class MyWeatherTask extends EngineTask {
  @run()
  async fetchCurrentTemperature(city: string) {
    return Promise.resolve(`Current Temperature in ${city}: 25°C`);
  }

  @run()
  async fetchDailyForecast(city: string) {
    return Promise.resolve(`Daily Forecast in ${city}: Sunny`);
  }

  @run()
  async recommendation(city: string): Promise<[string, void]> {
    const vigilanceTask = new MyVigilanceTask();
    return Promise.all([vigilanceTask.decideIfIShouldGoOut(city), vigilanceTask.decideIfIShouldGoOutNextYear(city)]);
  }
}

@engine({ id: 'whetherEngine' })
class MyVigilanceTask extends EngineTask {
  @run({
    trace: { id: 'decideIfIShouldGoOut_custom_id', narratives: ['Narrative 0 GoOut'] },
    config: { parallel: true, traceExecution: { inputs: true, outputs: true, narratives: ['Narrative 1 GoOut', 'Narrative 2 GoOut'] } }
  })
  async decideIfIShouldGoOut(city: string) {
    const temperature = await new MyWeatherTask().fetchCurrentTemperature(city);
    const forecast = await new MyWeatherTask().fetchDailyForecast(city);

    const color = this.engine.run((t, f) => 'GREEN', [temperature, forecast], {
      trace: { label: 'color' },
      config: { parallel: true, traceExecution: true }
    })?.outputs;

    const decision = this.engine.run((t, f) => 'go out', [temperature, forecast], {
      trace: { label: 'decide' },
      config: { parallel: true, traceExecution: true }
    })?.outputs;

    return Promise.resolve(
      `As daily Forecast in ${city} is ${forecast} and the temperature is ${temperature}, vigilance is ${color} and you can ${decision}`
    );
  }

  @run({ config: { parallel: true, errors: 'catch', traceExecution: true } })
  async decideIfIShouldGoOutNextYear(city: string) {
    throw new Error(`Next year too far!, could not decide for ${city}`);
  }

  @run()
  validateDecision(stringDecision: string) {
    return stringDecision?.includes('GREEN');
  }
}

@engine({ id: 'VigilanceValidationEngine' })
class MyIndependantVigilanceTask extends MyVigilanceTask {}

export async function generate() {
  const myWeatherTaskInstance = new MyWeatherTask();

  await myWeatherTaskInstance.fetchCurrentTemperature('Monastir');
  await myWeatherTaskInstance.fetchDailyForecast('Monastir');
  const response = await myWeatherTaskInstance.recommendation('Monastir');

  //call validation:
  const myVigilanceInstance = new MyVigilanceTask();
  myVigilanceInstance.validateDecision(response[0]);

  const myWeatherTaskInstanceTraceAfterValidation = myWeatherTaskInstance.engine.getTrace();

  //call independent validation: as it is decorated with engineID: "VigilanceValidationEngine"
  const myValidationTask = new MyIndependantVigilanceTask();
  myValidationTask.validateDecision(response[0]);
  const myValidationIndependentTrace = myValidationTask.engine.getTrace();

  const jsonString = JSON.stringify(myWeatherTaskInstanceTraceAfterValidation.concat(myValidationIndependentTrace), null, 2);
  writeTrace(jsonString);
}

generate().then();
