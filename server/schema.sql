CREATE TABLE asset (
    symbol BYTEA,
    asset_type BYTEA,
    address BYTEA
);

CREATE TABLE pricefeed (
    asset_symbol BYTEA,
    price BYTEA,
    tstamp BYTEA
);

CREATE TABLE cdp (
    asset_symbol BYTEA,
    addr BYTEA,
    xlm_dep BIGINT,
    asset_lnt BIGINT,
    status INTEGER
);

CREATE TABLE staker (
    asset_symbol BYTEA,
    addr BYTEA,
    xasset BYTEA,
    prod_cons BYTEA,
    comp_cons BYTEA,
    epoch BYTEA
);

CREATE TABLE liquidity_pool (
    asset_symbol BYTEA,
    pool_address BYTEA
);

CREATE TABLE singletons (
    key BYTEA,
    value BYTEA
);