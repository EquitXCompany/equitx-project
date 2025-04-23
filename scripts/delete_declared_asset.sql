-- This script deletes all rows from the database related to a specific asset.
-- It first retrieves the asset_id based on the asset symbol, then deletes all related rows from various tables.
-- Finally, it deletes the asset itself from the asset table.
-- Make sure to replace 'xATOM' with the actual asset symbol you want to delete.
-- Note: This script assumes that the asset symbol is unique in the asset table.
-- Make sure to run this script in a safe environment as it will delete data.
-- Ensure you have a backup of your database before running this script.

DO $$
DECLARE
    asset_id_to_delete UUID;
	asset_symbol TEXT := 'xATOM';
BEGIN
    SELECT id INTO asset_id_to_delete
    FROM asset
    WHERE symbol = asset_symbol;

    -- Check if the asset_id was found
    IF asset_id_to_delete IS NOT NULL THEN
        -- Log the asset_id for rows to be deleted
        RAISE NOTICE 'Rows to be deleted for asset_id: %', asset_id_to_delete;

        -- Delete rows from price_history with the found asset_id
        DELETE FROM price_history WHERE price_history.asset_id = asset_id_to_delete;
        RAISE NOTICE 'Rows deleted successfully from price_history';

		DELETE from tvl_metrics WHERE tvl_metrics.asset_id = asset_id_to_delete;
		RAISE NOTICE 'Rows deleted successfully from tvl_metrics';

		DELETE from utilization_metrics WHERE utilization_metrics.asset_id = asset_id_to_delete;
		RAISE NOTICE 'Rows deleted successfully from utilization_metrics';

		DELETE from liquidity_pools WHERE liquidity_pools.asset_id = asset_id_to_delete;
		RAISE NOTICE 'Rows deleted successfully from liquidity_pools';

		DELETE from cdp_metrics WHERE cdp_metrics.asset_id = asset_id_to_delete;
		RAISE NOTICE 'Rows deleted successfully from cdp_metrics';

		DELETE from liquidations WHERE liquidations.asset_id = asset_id_to_delete;
		RAISE NOTICE 'Rows deleted successfully from liquidations';

		DELETE from cdps WHERE cdps.asset_id = asset_id_to_delete;
		RAISE NOTICE 'Rows deleted successfully from cdps';

		DELETE from stakers WHERE stakers.asset_id = asset_id_to_delete;
		RAISE NOTICE 'Rows deleted successfully from stakers';

		DELETE from cdp_history WHERE cdp_history.asset_id = asset_id_to_delete;
		RAISE NOTICE 'Rows deleted successfully from cdp_history';

		DELETE from staker_history WHERE staker_history.asset_id = asset_id_to_delete;
		RAISE NOTICE 'Rows deleted successfully from staker_history';
    ELSE
        RAISE NOTICE 'No asset found with symbol %', asset_symbol;
    END IF;

	DELETE from asset where id = asset_id_to_delete;
	RAISE NOTICE 'Successfully deleted asset %', asset_symbol;
END $$;