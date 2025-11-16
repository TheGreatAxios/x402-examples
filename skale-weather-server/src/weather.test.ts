import { test, expect } from 'bun:test';
import { privateKeyToAccount } from 'viem/accounts';
import { wrapFetchWithPayment, PaymentRequirementsSelector } from 'x402-fetch';

// @ts-expect-error - timeout option not in types
test('GET /weather', { timeout: 30000 }, async () => {
  const API_BASE_URL = 'http://localhost:3000';
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  const selector: PaymentRequirementsSelector = (requirements) => 
    requirements.find(r => r.extra?.name === "Bridged USDC (SKALE Bridge)" || r.description?.includes("Bridged USDC")) || requirements[0];
  const fetchWithPayment = wrapFetchWithPayment(fetch, account as any, BigInt(10000), selector);
  
  const response = await fetchWithPayment(`${API_BASE_URL}/weather`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  
  const result = await response.json() as { message: string };
  
  expect(result).toHaveProperty('message');
  expect(typeof result.message).toBe('string');
  expect(result.message).toBe('the weather is sunny and 75 degrees fahrenheit');
});

