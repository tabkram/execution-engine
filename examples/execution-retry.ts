/** Retry temporary failures with a function wrapper and a method decorator, without network requests. */
import { retry } from '../src';

// #region function
async function runFunctionExample(): Promise<void> {
  let executions = 0;
  const getInvoice = retry(
    (id: string) => {
      executions++;
      if (executions < 3) throw new Error('Temporary failure');
      return { id };
    },
    {
      attempts: 3,
      initialDelay: 10,
      onRetry: ({ attempt, delay }) => console.log(`retry: attempt ${attempt}, next in ${delay} ms`)
    }
  );

  const invoice = await getInvoice('inv-123');
  console.log(`retry: ${invoice.id} after ${executions} executions`);
}
// #endregion function

// #region decorator
class BillingService {
  executions = 0;

  @retry({
    attempts: 3,
    backoff: 'fixed',
    initialDelay: 10,
    onRetry: ({ attempt, delay }) => console.log(`@retry: attempt ${attempt}, next in ${delay} ms`)
  })
  async getInvoice(id: string): Promise<{ id: string }> {
    this.executions++;
    if (this.executions < 2) throw new Error('Temporary failure');
    return { id };
  }
}

async function runDecoratorExample(): Promise<void> {
  const service = new BillingService();
  const invoice = await service.getInvoice('inv-456');
  console.log(`@retry: ${invoice.id} after ${service.executions} executions`);
}
// #endregion decorator

async function run(): Promise<void> {
  await runFunctionExample();
  await runDecoratorExample();
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
