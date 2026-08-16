import {
  SpWithdrawalRequest,
  CombinationItem,
  AlternativeCombination,
  PaymentMethod,
} from './sdeedpay-types';

export interface AiSuggestionResult {
  suggested_combination: CombinationItem[];
  alternatives: AlternativeCombination[];
  ai_reasoning: string[];
  exactMatchFound: boolean;
  totalMatched: number;
}

/**
 * AI Suggestion Engine for sdeedpay v1.1.0
 * 
 * Rules:
 * Priority 1: Match exact amount with fewest transfers
 * Priority 2: DO NOT break amounts >= 50 unless no other option
 * Priority 3: Always leave at least 1x50 and 1x40 in pool if possible
 * Priority 4: FIFO within same amount (sort by created_at ascending)
 */
export function runAiSuggestionEngine(
  availableRequests: SpWithdrawalRequest[],
  targetAmount: number,
  method?: PaymentMethod,
): AiSuggestionResult {
  // Filter by matching method if specified
  const pool = (
    method ? availableRequests.filter((r) => r.method === method && r.status === 'in_pool') : availableRequests.filter((r) => r.status === 'in_pool')
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const reasoning: string[] = [];

  // Group pool by denomination
  const poolByDenom: Record<number, SpWithdrawalRequest[]> = {};
  pool.forEach((req) => {
    if (!poolByDenom[req.amount]) poolByDenom[req.amount] = [];
    poolByDenom[req.amount].push(req);
  });

  const count50Plus = pool.filter((r) => r.amount >= 50).length;
  const count40 = (poolByDenom[40] || []).length;
  const count30 = (poolByDenom[30] || []).length;
  const count20 = (poolByDenom[20] || []).length;
  const count10 = (poolByDenom[10] || []).length;

  reasoning.push(
    `Analyzed available pool of ${pool.length} requests for method: ${method ? method.toUpperCase() : 'ALL'}. Denominations: ${count10}x$10, ${count20}x$20, ${count30}x$30, ${count40}x$40, ${count50Plus}x$50+.`,
  );

  // Helper: Find combination using subset-sum/knapsack with custom score
  function findBestCombination(
    allowBreakingBigBills: boolean,
    mustPreserve1x50And40: boolean,
  ): SpWithdrawalRequest[] | null {
    // Determine which pool items are candidate
    let candidates = [...pool];

    if (mustPreserve1x50And40) {
      // Exclude one 50 and one 40 from available if present
      let preserved50 = false;
      let preserved40 = false;
      candidates = candidates.filter((item) => {
        if (item.amount >= 50 && !preserved50 && count50Plus > 0) {
          preserved50 = true;
          return false;
        }
        if (item.amount === 40 && !preserved40 && count40 > 0) {
          preserved40 = true;
          return false;
        }
        return true;
      });
    }

    if (!allowBreakingBigBills && targetAmount < 50) {
      // Never use >= 50 bills if target is smaller than 50
      candidates = candidates.filter((item) => item.amount < 50);
    }

    // Dynamic programming or recursive search with preference for smaller bills when target < 50,
    // and fewest transfers when target >= 50.
    const results: SpWithdrawalRequest[][] = [];

    function search(index: number, currentSum: number, currentSelected: SpWithdrawalRequest[]) {
      if (currentSum === targetAmount) {
        results.push([...currentSelected]);
        return;
      }
      if (currentSum > targetAmount || index >= candidates.length) return;
      if (results.length > 50) return; // Cap branch limit

      // Try including candidates[index]
      search(index + 1, currentSum + candidates[index].amount, [...currentSelected, candidates[index]]);
      // Try skipping candidates[index]
      search(index + 1, currentSum, currentSelected);
    }

    // Sort candidates for FIFO and strategic choice
    if (targetAmount <= 40) {
      // For small amounts like 40, prefer using smaller denominations (10s, 20s) to keep 40/50s for big advertisers
      candidates.sort((a, b) => {
        if (a.amount !== b.amount) return a.amount - b.amount;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    } else {
      // For larger amounts (e.g. 100+), try greedy / fewest transfers
      candidates.sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }

    search(0, 0, []);

    if (results.length === 0) return null;

    // Pick candidate with best score
    // Score criteria:
    // - Minimize use of >=50 if targetAmount < 50
    // - Minimize total count of transfers
    // - FIFO preference
    results.sort((a, b) => {
      const aBigBills = a.filter((r) => r.amount >= 50).length;
      const bBigBills = b.filter((r) => r.amount >= 50).length;
      if (aBigBills !== bBigBills) return aBigBills - bBigBills;
      return a.length - b.length;
    });

    return results[0];
  }

  // Strategy 1: Smart Liquidity Preservation (AI Recommended)
  let selectedPrimary = findBestCombination(false, true);

  if (selectedPrimary) {
    reasoning.push(
      `[Optimal Rule Applied]: Successfully protected high-denomination bills (≥$50 & $40) for high-volume advertisers while fulfilling exact $${targetAmount} with ${selectedPrimary.length} transfer(s).`,
    );
  } else {
    // Strategy 1b: Soften preservation requirement if pool is tight
    selectedPrimary = findBestCombination(false, false);
    if (selectedPrimary) {
      reasoning.push(
        `[Standard Rule Applied]: Fulfill $${targetAmount} without breaking ≥$50 bills. Total transfers: ${selectedPrimary.length}.`,
      );
    } else {
      // Strategy 1c: Fallback to any combination
      selectedPrimary = findBestCombination(true, false);
      if (selectedPrimary) {
        reasoning.push(
          `[Fallback Rule]: Pool liquidity was tight; broke larger denominations to fulfill the exact amount.`,
        );
      }
    }
  }

  // Strategy 2: Alternative 1 - Fewest Transfers (Pure Greedy)
  const greedyCandidates = [...pool].sort((a, b) => b.amount - a.amount || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const greedySelected: SpWithdrawalRequest[] = [];
  let rem = targetAmount;
  for (const item of greedyCandidates) {
    if (item.amount <= rem) {
      greedySelected.push(item);
      rem -= item.amount;
      if (rem === 0) break;
    }
  }

  // Strategy 3: Alternative 2 - Micro-split (prefer 10s & 20s for maximum worker reach)
  const microCandidates = [...pool].sort((a, b) => a.amount - b.amount || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const microSelected: SpWithdrawalRequest[] = [];
  let remMicro = targetAmount;
  for (const item of microCandidates) {
    if (item.amount <= remMicro) {
      microSelected.push(item);
      remMicro -= item.amount;
      if (remMicro === 0) break;
    }
  }

  function requestsToCombination(items: SpWithdrawalRequest[]): CombinationItem[] {
    const grouped: Record<number, { count: number; ids: string[] }> = {};
    items.forEach((item) => {
      if (!grouped[item.amount]) grouped[item.amount] = { count: 0, ids: [] };
      grouped[item.amount].count += 1;
      grouped[item.amount].ids.push(item.id);
    });

    return Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)
      .map((amt) => ({
        amount: amt,
        count: grouped[amt].count,
        request_ids: grouped[amt].ids,
      }));
  }

  const primaryCombo = selectedPrimary ? requestsToCombination(selectedPrimary) : [];

  const alternatives: AlternativeCombination[] = [];

  // Add Smart Preservation as Option A
  if (selectedPrimary) {
    alternatives.push({
      id: 'alt_smart',
      title: 'AI Smart Preservation (Recommended)',
      strategy: 'smart_preservation',
      combination: primaryCombo,
      transfersCount: selectedPrimary.length,
      preservedBigBills: count50Plus + count40 - selectedPrimary.filter((r) => r.amount >= 40).length,
      reasoning: 'Balances fewest transfers while reserving $50+ & $40 bills for high-tier deposits.',
    });
  }

  // Add Greedy if different
  if (rem === 0 && greedySelected.length > 0) {
    const greedyCombo = requestsToCombination(greedySelected);
    const isSame = JSON.stringify(greedyCombo) === JSON.stringify(primaryCombo);
    if (!isSame) {
      alternatives.push({
        id: 'alt_greedy',
        title: 'Minimal Transfers (Greedy)',
        strategy: 'fewest_transfers',
        combination: greedyCombo,
        transfersCount: greedySelected.length,
        preservedBigBills: count50Plus + count40 - greedySelected.filter((r) => r.amount >= 40).length,
        reasoning: 'Gives the absolute minimum number of cards, using largest available bills first.',
      });
    }
  }

  // Add Micro-split if different
  if (remMicro === 0 && microSelected.length > 0) {
    const microCombo = requestsToCombination(microSelected);
    const isSameAsPrimary = JSON.stringify(microCombo) === JSON.stringify(primaryCombo);
    const isSameAsGreedy = alternatives.some((a) => JSON.stringify(a.combination) === JSON.stringify(microCombo));
    if (!isSameAsPrimary && !isSameAsGreedy) {
      alternatives.push({
        id: 'alt_micro',
        title: 'Micro-Denomination Split',
        strategy: 'micro_balanced',
        combination: microCombo,
        transfersCount: microSelected.length,
        preservedBigBills: count50Plus + count40 - microSelected.filter((r) => r.amount >= 40).length,
        reasoning: 'Spreads deposit across smaller worker requests ($10, $20) to maximize payout clearance.',
      });
    }
  }

  const totalMatched = primaryCombo.reduce((sum, item) => sum + item.amount * item.count, 0);

  return {
    suggested_combination: primaryCombo,
    alternatives,
    ai_reasoning: reasoning,
    exactMatchFound: totalMatched === targetAmount,
    totalMatched,
  };
}
