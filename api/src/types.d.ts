export interface QuoteResponse {
    inAmount: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    priceImpactPct: string;
    routePlan: Array<{
        swapInfo: {
            ammKey: string;
            label: string;
            inputMint: string;
            outputMint: string;
            inAmount: string;
            outAmount: string;
            feeAmount: string;
            feeMint: string;
        };
        percent: number;
    }>;
    contextSlot: number;
    timeTaken: number;
    error?: string;
}

export interface SwapResponse {
    swapTransaction: string;
    lastValidBlockHeight: number;
    prioritizationFeeLamports: number;
    error?: string;
}

export interface SwapRequestBody {
    inputMint?: string;
    outputMint?: string;
    amount?: number;
    direction?: 'usdtToSol' | 'solToUsdt' | 'usdtToEth' | 'ethToUsdt' | 'aptToUsdt' | 'usdtToApt';
}

export interface BalanceParams {
    mintAddress: string;
}

export interface BalanceParams {
    mintAddress: string;
}

export interface SwapResponseBody {
    success: boolean;
    txid: string;
    explorer: string;
    amountIn: number;
    amountOut: string;
}

export interface ErrorResponse {
    error: string;
}


export interface BalanceParams {
    mintAddress: string;
}

export interface BalanceResponse {
    balance: number;
}
