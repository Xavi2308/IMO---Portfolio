-- ========================================
-- CORRECCIÓN: RECURSIÓN INFINITA EN POLÍTICAS RLS
-- ========================================

-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS PROBLEMÁTICAS
DROP POLICY IF EXISTS customer_accounts_company_policy ON customer_accounts;
DROP POLICY IF EXISTS payment_receipts_company_policy ON payment_receipts;
DROP POLICY IF EXISTS dispatches_company_policy ON dispatches;
DROP POLICY IF EXISTS dispatch_items_company_policy ON dispatch_items;
DROP POLICY IF EXISTS account_transactions_company_policy ON account_transactions;
DROP POLICY IF EXISTS company_consecutives_company_policy ON company_consecutives;

-- PASO 2: CREAR POLÍTICAS SIMPLIFICADAS SIN RECURSIÓN
-- Política para customer_accounts (solo usar users.company_id)
CREATE POLICY customer_accounts_simple_policy ON customer_accounts
    FOR ALL USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Política para payment_receipts
CREATE POLICY payment_receipts_simple_policy ON payment_receipts
    FOR ALL USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Política para dispatches
CREATE POLICY dispatches_simple_policy ON dispatches
    FOR ALL USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Política para dispatch_items (usando la relación con dispatches)
CREATE POLICY dispatch_items_simple_policy ON dispatch_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM dispatches d 
            WHERE d.id = dispatch_items.dispatch_id 
            AND d.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Política para account_transactions
CREATE POLICY account_transactions_simple_policy ON account_transactions
    FOR ALL USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Política para company_consecutives
CREATE POLICY company_consecutives_simple_policy ON company_consecutives
    FOR ALL USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- ========================================
-- VERIFICACIÓN: COMPROBAR QUE NO HAY RECURSIÓN
-- ========================================

-- Listar todas las políticas activas
SELECT 
    schemaname,
    tablename,
    policyname,
    '✅ POLÍTICA ACTIVA' as estado
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('customer_accounts', 'payment_receipts', 'dispatches', 'dispatch_items', 'account_transactions', 'company_consecutives')
ORDER BY tablename, policyname;

-- ========================================
-- SCRIPT COMPLETADO - SIN RECURSIÓN
-- ========================================
