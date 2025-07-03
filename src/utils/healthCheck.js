class HealthCheck {
  constructor() {
    this.lastSuccessfulCall = null;
    this.consecutiveFailures = 0;
    this.isHealthy = true;
  }

  recordSuccess() {
    this.lastSuccessfulCall = new Date();
    this.consecutiveFailures = 0;
    this.isHealthy = true;
    console.log('API health check: SUCCESS');
  }

  recordFailure(error) {
    this.consecutiveFailures++;
    console.error(`API health check: FAILURE (${this.consecutiveFailures} consecutive)`, error);
    
    // Consider unhealthy after 3 consecutive failures
    if (this.consecutiveFailures >= 3) {
      this.isHealthy = false;
    }
  }

  getStatus() {
    return {
      isHealthy: this.isHealthy,
      lastSuccessfulCall: this.lastSuccessfulCall,
      consecutiveFailures: this.consecutiveFailures,
      timeSinceLastSuccess: this.lastSuccessfulCall 
        ? Date.now() - this.lastSuccessfulCall.getTime() 
        : null
    };
  }

  shouldShowWarning() {
    const status = this.getStatus();
    
    // Show warning if unhealthy or no successful call in 10 minutes
    return !status.isHealthy || 
           (status.timeSinceLastSuccess && status.timeSinceLastSuccess > 10 * 60 * 1000);
  }

  getWarningMessage() {
    const status = this.getStatus();
    
    if (!status.isHealthy) {
      return `API connection issues detected. ${status.consecutiveFailures} consecutive failures.`;
    }
    
    if (status.timeSinceLastSuccess && status.timeSinceLastSuccess > 10 * 60 * 1000) {
      const minutesAgo = Math.floor(status.timeSinceLastSuccess / (60 * 1000));
      return `No successful API calls in ${minutesAgo} minutes. Check network connection.`;
    }
    
    return null;
  }

  reset() {
    this.consecutiveFailures = 0;
    this.isHealthy = true;
    console.log('API health check: RESET');
  }
}

export const healthCheck = new HealthCheck();
export default healthCheck;
