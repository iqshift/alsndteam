-- ============ Extensions ============
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ Admins ============
CREATE TABLE admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(20) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Zones ============
CREATE TABLE zones (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(100) NOT NULL,
    delivery_price    NUMERIC(10,2) NOT NULL,
    driver_deduction  NUMERIC(10,2) NOT NULL,
    boundary          GEOGRAPHY(POLYGON, 4326) NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_zones_boundary ON zones USING GIST (boundary);

-- ============ Restaurants ============
CREATE TABLE restaurants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(20) NOT NULL UNIQUE,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    password_hash   TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_restaurants_location ON restaurants USING GIST (location);

CREATE TABLE restaurant_zone_usage (
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    usage_count     INT NOT NULL DEFAULT 1,
    last_used_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (restaurant_id, zone_id)
);

-- ============ Drivers ============
CREATE TABLE drivers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(150) NOT NULL,
    phone                   VARCHAR(20) NOT NULL UNIQUE,
    password_hash           TEXT NOT NULL,
    current_location        GEOGRAPHY(POINT, 4326),
    location_updated_at     TIMESTAMPTZ,
    availability_status     VARCHAR(20) NOT NULL DEFAULT 'offline',
    wallet_balance          NUMERIC(12,2) NOT NULL DEFAULT 0,
    status                  VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_drivers_location ON drivers USING GIST (current_location);
CREATE INDEX idx_drivers_status ON drivers (availability_status);

-- ============ Orders ============
CREATE TABLE orders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id           UUID NOT NULL REFERENCES restaurants(id),
    driver_id               UUID REFERENCES drivers(id),
    customer_phone          VARCHAR(20) NOT NULL,
    customer_address        TEXT NOT NULL,
    nearest_landmark        TEXT,
    order_value             NUMERIC(12,2) NOT NULL,
    zone_id                 UUID NOT NULL REFERENCES zones(id),
    delivery_price          NUMERIC(10,2) NOT NULL,
    driver_deduction        NUMERIC(10,2) NOT NULL,
    status                  VARCHAR(30) NOT NULL DEFAULT 'searching_driver',
    assigned_manually       BOOLEAN NOT NULL DEFAULT false,
    assigned_by_admin_id    UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_at             TIMESTAMPTZ,
    arrived_restaurant_at   TIMESTAMPTZ,
    picked_up_at            TIMESTAMPTZ,
    delivered_at            TIMESTAMPTZ,
    cancelled_at            TIMESTAMPTZ
);
CREATE INDEX idx_orders_restaurant ON orders (restaurant_id, created_at DESC);
CREATE INDEX idx_orders_driver ON orders (driver_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders (status);

-- ============ Order Broadcasts ============
CREATE TABLE order_broadcasts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id       UUID NOT NULL REFERENCES drivers(id),
    tier            INT NOT NULL DEFAULT 1,
    response        VARCHAR(20),
    broadcast_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at    TIMESTAMPTZ
);
CREATE INDEX idx_broadcasts_order ON order_broadcasts (order_id);

-- ============ Recharge Codes ============
CREATE TABLE recharge_codes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(30) NOT NULL UNIQUE,
    value               NUMERIC(12,2) NOT NULL,
    is_used             BOOLEAN NOT NULL DEFAULT false,
    used_by_driver_id   UUID REFERENCES drivers(id),
    used_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Wallet Transactions ============
CREATE TABLE wallet_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id           UUID NOT NULL REFERENCES drivers(id),
    type                VARCHAR(20) NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    order_id            UUID REFERENCES orders(id),
    recharge_code_id    UUID REFERENCES recharge_codes(id),
    balance_after       NUMERIC(12,2) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tx_driver ON wallet_transactions (driver_id, created_at DESC);

-- ============ Audit Logs ============
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type      VARCHAR(20) NOT NULL,
    actor_id        UUID,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_action ON audit_logs (action, created_at DESC);

-- ============ Refresh Tokens ============
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token       TEXT NOT NULL UNIQUE,
    user_id     UUID NOT NULL,
    user_type   VARCHAR(20) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id, user_type);
