-- Users
INSERT INTO users (display_name, email, auth_provider_id, deleted, deleted_at)
VALUES
('Alice Example', 'alice@example.com', 'google_123', false, NULL),
('Bob Example', 'bob@example.com', 'facebook_456', false, NULL);

-- Gift Cards
INSERT INTO gift_card (user_id, nickname, vendor_place_id, vendor_name, initial_balance, current_balance, currency, deleted, deleted_at)
VALUES
((SELECT id FROM users WHERE email='alice@example.com'), 'Coffee Gift', 'place_001', 'Starbucks', 1000, 1000, 'USD', false, NULL),
((SELECT id FROM users WHERE email='alice@example.com'), 'Book Gift', 'place_002', 'Barnes & Noble', 2500, 2500, 'USD', false, NULL),
((SELECT id FROM users WHERE email='bob@example.com'), 'Pizza Gift', 'place_003', 'Pizza Hut', 2000, 2000, 'USD', false, NULL),
((SELECT id FROM users WHERE email='bob@example.com'), 'Movie Gift', 'place_004', 'Cineplex', 1500, 1500, 'USD', false, NULL);

-- Stamp Cards
INSERT INTO stamp_card (user_id, nickname, vendor_place_id, vendor_name, stamps_needed, stamps_acquired, deleted, deleted_at)
VALUES
((SELECT id FROM users WHERE email='alice@example.com'), 'Coffee Loyalty', 'place_001', 'Starbucks', 10, 3, false, NULL),
((SELECT id FROM users WHERE email='bob@example.com'), 'Pizza Loyalty', 'place_003', 'Pizza Hut', 8, 5, false, NULL);

-- Notifications
INSERT INTO notifications (user_id, gift_card_id, stamp_card_id, type, status, subject, body)
VALUES
((SELECT id FROM users WHERE email='alice@example.com'), 
 (SELECT id FROM gift_card WHERE nickname='Coffee Gift'), NULL, 'balance_update', 'sent', 'Your Coffee Gift Balance', 'You have $10.00 left.'),
((SELECT id FROM users WHERE email='alice@example.com'), NULL, 
 (SELECT id FROM stamp_card WHERE nickname='Coffee Loyalty'), 'stamp_update', 'pending', 'Coffee Stamp Update', 'You have 3/10 stamps.'),
((SELECT id FROM users WHERE email='bob@example.com'), 
 (SELECT id FROM gift_card WHERE nickname='Pizza Gift'), NULL, 'balance_update', 'sent', 'Pizza Gift Balance', 'You have $20.00 left.'),
((SELECT id FROM users WHERE email='bob@example.com'), NULL, 
 (SELECT id FROM stamp_card WHERE nickname='Pizza Loyalty'), 'stamp_update', 'pending', 'Pizza Stamp Update', 'You have 5/8 stamps.');

-- User Notification Preferences
INSERT INTO user_notification_preferences (user_id, general_notification_window_start, general_notification_window_end, notify_window_days, notifications_enabled, deleted, deleted_at)
VALUES
((SELECT id FROM users WHERE email='alice@example.com'), '2026-01-30 08:00:00+00', '2026-01-30 20:00:00+00', ARRAY['Mon','Wed','Fri'], true, false, NULL),
((SELECT id FROM users WHERE email='bob@example.com'), '2026-01-30 09:00:00+00', '2026-01-30 21:00:00+00', ARRAY['Tue','Thu'], true, false, NULL);
