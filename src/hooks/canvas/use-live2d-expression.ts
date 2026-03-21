// @ts-nocheck
import { useCallback } from 'react';

/**
 * Hook for handling Live2D model expressions via LAppAdapter
 */
export const useLive2DExpression = () => {
  const setExpression = useCallback((
    expressionValue: string | number,
    lappAdapter: any,
  ) => {
    try {
      if (typeof expressionValue === 'string') {
        lappAdapter.setExpression(expressionValue);
      } else if (typeof expressionValue === 'number') {
        const expressionName = lappAdapter.getExpressionName(expressionValue);
        if (expressionName) {
          lappAdapter.setExpression(expressionName);
        }
      }
    } catch (error) {
      console.error('Failed to set expression:', error);
    }
  }, []);

  const resetExpression = useCallback((lappAdapter: any) => {
    if (!lappAdapter) return;
    try {
      const model = lappAdapter.getModel();
      if (!model || !model._modelSetting) return;

      const expressionCount = lappAdapter.getExpressionCount();
      if (expressionCount > 0) {
        const defaultExpressionName = lappAdapter.getExpressionName(0);
        if (defaultExpressionName) {
          lappAdapter.setExpression(defaultExpressionName);
        }
      }
    } catch (error) {
      console.debug('Failed to reset expression:', error);
    }
  }, []);

  return { setExpression, resetExpression };
};
