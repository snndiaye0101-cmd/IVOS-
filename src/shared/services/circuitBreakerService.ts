/**
 * ============================================
 * Circuit Breaker Service
 * ============================================
 *
 * Implements the Circuit Breaker pattern for webhook calls
 * and other external integrations to prevent cascading failures.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests fail fast
 * - HALF_OPEN: Testing if service recovered, allowing limited requests
 */

import { supabase } from './supabaseClient';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening
  successThreshold: number; // Successes to close from HALF_OPEN
  timeout: number; // Milliseconds before trying HALF_OPEN
  retryDelay: number; // Base delay for exponential backoff (ms)
  maxRetries: number; // Maximum retry attempts
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: string;
  lastAttemptTime?: string;
  openedAt?: string;
  nextRetryAt?: string;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  retryDelay: 1000, // 1 second base
  maxRetries: 3,
};

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastAttemptTime: number | null;
  openedAt: number | null;
}

const circuitStates = new Map<string, CircuitBreakerState>();

function getOrCreateBreaker(name: string, config: CircuitBreakerConfig): CircuitBreakerState {
  if (!circuitStates.has(name)) {
    circuitStates.set(name, {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastAttemptTime: null,
      openedAt: null,
    });
  }
  return circuitStates.get(name)!;
}

function isTimeoutExpired(openedAt: number | null, timeout: number): boolean {
  if (!openedAt) return false;
  return Date.now() - openedAt >= timeout;
}

function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  // Exponential backoff with jitter: baseDelay * 2^attempt + random(0, baseDelay)
  const exponential = baseDelay * Math.pow(2, Math.min(attempt, 5));
  const jitter = Math.random() * baseDelay;
  return exponential + jitter;
}

async function logCircuitEvent(
  breakerName: string,
  eventType: 'opened' | 'closed' | 'half_open' | 'success' | 'failure',
  details: Record<string, unknown>
) {
  try {
    await supabase.from('circuit_breaker_logs').insert({
      breaker_name: breakerName,
      event_type: eventType,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn(`Failed to log circuit breaker event: ${eventType}`, error);
  }
}

/**
 * Execute a function with circuit breaker protection
 * @param name Unique identifier for the circuit breaker
 * @param fn The async function to execute
 * @param config Circuit breaker configuration (optional)
 * @returns Result of fn() or throws error if circuit is open
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  config = DEFAULT_CONFIG
): Promise<T> {
  const breaker = getOrCreateBreaker(name, config);
  const now = Date.now();

  // Update last attempt time
  breaker.lastAttemptTime = now;

  // Check circuit state and handle transitions
  if (breaker.state === 'OPEN') {
    if (isTimeoutExpired(breaker.openedAt, config.timeout)) {
      // Transition to HALF_OPEN
      breaker.state = 'HALF_OPEN';
      breaker.successCount = 0;
      await logCircuitEvent(name, 'half_open', { previousFailures: breaker.failureCount });
    } else {
      // Circuit still open
      const error = new Error(`Circuit breaker "${name}" is OPEN`);
      await logCircuitEvent(name, 'failure', {
        reason: 'circuit_open',
        failureCount: breaker.failureCount,
      });
      throw error;
    }
  }

  // Execute function with retry logic
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();

      // Success
      if (breaker.state === 'HALF_OPEN') {
        breaker.successCount++;
        if (breaker.successCount >= config.successThreshold) {
          // Transition to CLOSED
          breaker.state = 'CLOSED';
          breaker.failureCount = 0;
          breaker.successCount = 0;
          breaker.openedAt = null;
          await logCircuitEvent(name, 'closed', { recoveredAfter: breaker.failureCount });
        }
      } else if (breaker.state === 'CLOSED') {
        // Stay closed, but reset failure count
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }

      await logCircuitEvent(name, 'success', { attempt, state: breaker.state });
      return result;
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxRetries) {
        const delay = calculateBackoffDelay(attempt, config.retryDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Record failure
      breaker.lastFailureTime = now;
      breaker.failureCount++;

      if (breaker.failureCount >= config.failureThreshold && breaker.state !== 'HALF_OPEN') {
        // Transition to OPEN
        breaker.state = 'OPEN';
        breaker.openedAt = now;
        await logCircuitEvent(name, 'opened', {
          failureCount: breaker.failureCount,
          threshold: config.failureThreshold,
          error: lastError.message,
        });
      } else if (breaker.state === 'HALF_OPEN') {
        // Back to OPEN after failed recovery attempt
        breaker.state = 'OPEN';
        breaker.openedAt = now;
        await logCircuitEvent(name, 'opened', {
          reason: 'recovery_failed',
          error: lastError.message,
        });
      } else {
        await logCircuitEvent(name, 'failure', {
          attempt,
          failureCount: breaker.failureCount,
          threshold: config.failureThreshold,
          error: lastError.message,
        });
      }

      throw lastError;
    }
  }

  throw lastError || new Error(`Circuit breaker "${name}" failed after retries`);
}

/**
 * Get metrics for a circuit breaker
 */
export function getCircuitBreakerMetrics(name: string): CircuitBreakerMetrics {
  const breaker = circuitStates.get(name);

  if (!breaker) {
    return {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
    };
  }

  return {
    state: breaker.state,
    failureCount: breaker.failureCount,
    successCount: breaker.successCount,
    lastFailureTime: breaker.lastFailureTime
      ? new Date(breaker.lastFailureTime).toISOString()
      : undefined,
    lastAttemptTime: breaker.lastAttemptTime
      ? new Date(breaker.lastAttemptTime).toISOString()
      : undefined,
    openedAt: breaker.openedAt ? new Date(breaker.openedAt).toISOString() : undefined,
    nextRetryAt:
      breaker.state === 'OPEN' && breaker.openedAt
        ? new Date(breaker.openedAt + DEFAULT_CONFIG.timeout).toISOString()
        : undefined,
  };
}

/**
 * Reset circuit breaker to initial state
 */
export function resetCircuitBreaker(name: string) {
  if (circuitStates.has(name)) {
    circuitStates.set(name, {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastAttemptTime: null,
      openedAt: null,
    });
    void logCircuitEvent(name, 'closed', { reason: 'manual_reset' });
  }
}

/**
 * Get all circuit breaker metrics
 */
export function getAllCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
  const result: Record<string, CircuitBreakerMetrics> = {};

  for (const [name] of circuitStates) {
    result[name] = getCircuitBreakerMetrics(name);
  }

  return result;
}
