import { engine, EngineTask, NodeData, run } from '../src';
import { writeTrace } from './common/writeTrace';

@engine({ id: 'greetingId' })
class GreetingTask extends EngineTask {
  @run({
    config: {
      traceExecution: {
        inputs: ['0.name', '0.age', '0.address.city', '1.name'],
        outputs: (out: any) => `the output I want to trace is: '${out.fullGreeting}'`,
        errors: true,
        narratives: true,
        startTime: true,
        endTime: false
      }
    }
  })
  generateGreeting(person: { [key: string]: any }, greeter: { [key: string]: string }, nodeData?: NodeData) {
    this.engine.pushNarratives(nodeData.id, [`here is tracing narrative for greeting ${person.name}`]);
    return {
      greeting: {
        fr: `Hello, ${person.name}`,
        es: `¡Hola, ${person.name}!`,
        en: `Hello, ${person.name}!`
      },
      greeter: `I'm ${greeter.name}.`,
      hobbies: [`Let's explore the world of ${person.hobbies.join(', ')} together!`],
      get fullGreeting() {
        return [this.greeting.en, this.greeter, ...this.hobbies].join(' ');
      }
    };
  }
}

export async function generate() {
  const myInstance = new GreetingTask();
  myInstance.generateGreeting(
    {
      name: 'John Doe',
      age: 30,
      isStudent: false,
      grades: [85, 90, 78, 95],
      address: {
        street: '123 Main Street',
        city: 'Cityville',
        zipcode: '12345'
      },
      contact: {
        email: 'john.doe@example.com',
        phone: '+1 555-1234'
      },
      hobbies: ['reading', 'traveling', 'coding'],
      isActive: true,
      birthday: '1992-05-15',
      isMarried: null
    },
    {
      name: 'Akram'
    }
  );

  // Retrieve the trace
  const trace = myInstance.engine.getTrace();
  const jsonString = JSON.stringify(trace, null, 2);
  writeTrace(jsonString);
}

generate().then();
