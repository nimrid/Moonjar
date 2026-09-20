import { describe, it, expect } from 'vitest';
import { calculatePremiumPct, getPriceCheck, BASKET_PRESETS } from './prestocks';
import { COMPANY_BLURBS, LESSONS } from './copy/index';
import { computeFleschKincaidGrade } from './flesch-kincaid';
import { findBannedWords } from './banned-words';

describe('Shared Package Unit Tests', () => {
  describe('PreStocks Pricing & Categorization', () => {
    it('calculates premium accurately', () => {
      expect(calculatePremiumPct(115, 100)).toBeCloseTo(15, 2);
      expect(calculatePremiumPct(80, 100)).toBeCloseTo(-20, 2);
      expect(calculatePremiumPct(102, 100)).toBeCloseTo(2, 2);
    });

    it('categorizes premium into kid-safe price check tags', () => {
      // > 10%
      const tooPricey = getPriceCheck(16.5);
      expect(tooPricey.tag).toBe('Too pricey');
      expect(tooPricey.skipCycle).toBe(true);
      expect(tooPricey.weightMultiplier).toBe(0);

      // +5% to +10%
      const littlePricey = getPriceCheck(7.2);
      expect(littlePricey.tag).toBe('A little pricey');
      expect(littlePricey.skipCycle).toBe(false);
      expect(littlePricey.weightMultiplier).toBe(0.5);

      // -5% to +5%
      const fairPrice = getPriceCheck(1.2);
      expect(fairPrice.tag).toBe('Fair price');
      expect(fairPrice.skipCycle).toBe(false);
      expect(fairPrice.weightMultiplier).toBe(1.0);

      // < -5%
      const onSale = getPriceCheck(-12.4);
      expect(onSale.tag).toBe('On sale');
      expect(onSale.skipCycle).toBe(false);
      expect(onSale.weightMultiplier).toBe(1.25);
    });
  });

  describe('Preset Baskets', () => {
    it('all basket presets sum to exactly 10,000 bps (100%)', () => {
      for (const preset of BASKET_PRESETS) {
        const totalBps = preset.entries.reduce((sum, e) => sum + e.weightBps, 0);
        expect(totalBps).toBe(10000);
      }
    });
  });

  describe('Kid Copy Safety & Reading Level Invariants', () => {
    it('contains ZERO banned gambling or urgency phrases in any company copy', () => {
      for (const [symbol, copy] of Object.entries(COMPANY_BLURBS)) {
        const combined = `${copy.little.whatTheyDo} ${copy.little.whyCool} ${copy.little.funFact} ${copy.big.whatTheyDo} ${copy.big.whyCool} ${copy.big.funFact}`;
        const violations = findBannedWords(combined);
        expect(violations, `Violations found in ${symbol}: ${violations.join(', ')}`).toEqual([]);
      }
    });

    it('contains ZERO banned phrases in any lesson', () => {
      for (const lesson of LESSONS) {
        const combined = `${lesson.little.summary} ${lesson.little.body} ${lesson.big.summary} ${lesson.big.body}`;
        const violations = findBannedWords(combined);
        expect(violations, `Violations in lesson ${lesson.id}: ${violations.join(', ')}`).toEqual([]);
      }
    });

    it('asserts reading level for Little copy <= Grade 5', () => {
      for (const [symbol, copy] of Object.entries(COMPANY_BLURBS)) {
        const grade = computeFleschKincaidGrade(copy.little.whatTheyDo);
        expect(grade, `${symbol} Little grade ${grade} must be <= 5.5`).toBeLessThanOrEqual(5.5);
      }
    });

    it('asserts reading level for Big copy <= Grade 8', () => {
      for (const [symbol, copy] of Object.entries(COMPANY_BLURBS)) {
        const grade = computeFleschKincaidGrade(copy.big.whatTheyDo);
        expect(grade, `${symbol} Big grade ${grade} must be <= 8.5`).toBeLessThanOrEqual(8.5);
      }
    });
  });
});
