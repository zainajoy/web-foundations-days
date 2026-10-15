# TicketHub: System Design

## 1. Requirements

### Functional requirements

TicketHub must allow users to:

1. Register, sign in, and manage their accounts.
2. Browse and search concerts and events.
3. View event details, ticket prices, and seat availability.
4. Select and temporarily hold available seats.
5. Pay for held seats and receive confirmed tickets.
6. View their purchased tickets and order history.
7. Receive an order confirmation after successful payment.
8. Release expired seat holds so other customers can buy those seats.

### Non-functional requirements

- **Speed:** Event pages should load within 2 seconds under normal conditions. Seat availability and hold requests should usually respond within 500 milliseconds, excluding external payment processing.
- **Correctness:** A seat must never be sold to two customers for the same event. An order must not be confirmed until payment has been verified.
- **Fairness:** Customers should enter a controlled waiting room during a popular sale. Requests should be processed in queue order as far as practical, with rate limits to discourage bots and automated purchasing.
- **Availability:** Browsing should remain available during high demand. If the purchasing system becomes overloaded, it should queue requests instead of accepting more purchases than it can safely process.
- **Security:** Authentication, authorization, encrypted connections, secure payment-provider integration, and protection against common web attacks are required.
- **Scalability:** The system should support two million registered users and a sudden increase in traffic during popular concert sales.
- **Reliability:** Orders and payment outcomes must be recorded durably. Failed or repeated requests must not create duplicate orders or charges.
- **Maintainability:** The application should use clear APIs, documented data relationships, logging, monitoring, and automated tests.

## 2. Traffic and capacity estimates

### Normal traffic

Assumptions:
- Registered users: 2,000,000.
- Daily visitors: 50,000.
- Each visitor views 10 pages.
- Tickets sold: 5,000 per day.
- A day contains 86,400 seconds.

**Page views per day**

50,000 × 10 = 500,000 page views/day.

**Average page requests per second**

500,000 ÷ 86,400 ≈ 5.8 requests/second.

Assuming normal traffic peaks at five times the daily average:

5.8 × 5 ≈ 29 requests/second.

**Average ticket sales rate**

5,000 ÷ 86,400 ≈ 0.058 tickets/second, or about 5 tickets every 86 seconds on average.

Page requests and ticket sales are different measurements: one purchase can involve several API requests.

### Popular concert sale

Assumptions:
- 200,000 people try to buy tickets.
- The sale starts at the same time for everyone.
- The first 10 minutes contain the initial demand.
- The event has 20,000 seats.

**Average incoming buyer demand**

200,000 ÷ 600 seconds ≈ 333 people/second.

This is about 57 times the normal average page-request rate of 5.8 requests/second, although these are different types of activity and the comparison is only an indicator of scale.

If each person makes five requests during the sale, the system may receive approximately:

200,000 × 5 ÷ 600 ≈ 1,667 requests/second.

If those requests arrive in a short burst, the instantaneous peak could be considerably higher.

**Demand compared with supply**

200,000 potential buyers ÷ 20,000 seats = 10 potential buyers per seat.

Only 10% of the people attempting to buy can receive a seat if everyone wants one of those 20,000 seats.

### Comparison and capacity strategy

| Measure | Normal day | Popular sale |
|---|---:|---:|
| Visitors or potential buyers | 50,000/day | 200,000 in 10 minutes |
| Approximate page/API request rate | 5.8 page requests/sec average | 1,667 requests/sec under the five-request assumption |
| Tickets available/sold | 5,000 sold/day | 20,000 seats |
| Main concern | Consistent response times | Overload, fairness, and seat correctness |

These are planning estimates, not measured production traffic. Capacity tests and real monitoring should determine final server sizes.

## 3. API design

All endpoints use HTTPS. Protected endpoints require authentication. JSON is used for request and response bodies.

### 1. Browse events

`GET /api/v1/events?search=music&page=1`

Returns published events matching the search.

Example response:

```json
{
  "events": [
    {
      "id": 101,
      "name": "Summer Music Festival",
      "venue": "City Arena",
      "date": "2027-06-20",
      "status": "on_sale"
    }
  ],
  "page": 1
}
```

### 2. View event seats

`GET /api/v1/events/101/seats`

Returns seat identifiers, prices, and current availability. Availability is informational and can change before a customer holds a seat.

Example response:

```json
{
  "event_id": 101,
  "seats": [
    {"id": 501, "label": "A1", "price": 2500, "status": "available"},
    {"id": 502, "label": "A2", "price": 2500, "status": "held"}
  ]
}
```

### 3. Hold seats

`POST /api/v1/holds`

Creates a temporary hold if the requested seats are still available. The server validates availability inside a database transaction.

Example request:

```json
{
  "event_id": 101,
  "seat_ids": [501],
  "idempotency_key": "hold-request-abc123"
}
```

Example response:

```json
{
  "hold_id": 9001,
  "expires_at": "2027-06-20T10:15:00Z",
  "status": "held"
}
```

A hold might expire after five minutes. The server returns `409 Conflict` if a requested seat has already been held or sold.

### 4. Pay for an order

`POST /api/v1/orders`

Creates an order for a valid hold and initiates payment through a payment provider. The server verifies the hold and payment result; the browser cannot declare an order paid by itself.

Example request:

```json
{
  "hold_id": 9001,
  "payment_method_token": "provider-token",
  "idempotency_key": "order-request-xyz789"
}
```

Example response:

```json
{
  "order_id": 7001,
  "status": "payment_pending"
}
```

After verified payment, the order becomes `confirmed`. Payment-provider webhooks update the order safely and idempotently.

### 5. View purchased tickets

`GET /api/v1/me/tickets`

Returns the authenticated customer's confirmed tickets.

Example response:

```json
{
  "tickets": [
    {
      "ticket_id": 3001,
      "event_id": 101,
      "seat_id": 501,
      "order_id": 7001,
      "status": "confirmed"
    }
  ]
}
```

### Additional API behaviour

- `400 Bad Request`: invalid input.
- `401 Unauthorized`: the customer is not authenticated.
- `403 Forbidden`: the customer is not permitted to access the resource.
- `404 Not Found`: the event, seat, hold, or order does not exist.
- `409 Conflict`: the seat is unavailable, the hold expired, or the request conflicts with the current order state.
- `429 Too Many Requests`: the client exceeded a rate limit.
- `500 Internal Server Error`: an unexpected server error occurred.

Idempotency keys prevent retries from creating duplicate holds, orders, or payment attempts. The server must also authorize users before exposing private orders or tickets.

## 4. Data model

A relational database such as PostgreSQL is suitable because ticket purchasing requires strong consistency, transactions, and uniqueness constraints.

### Tables and relationships

**Users**
- `id` — primary key.
- `name` — customer's name.
- `email` — unique email address.
- `password_hash` — securely hashed password.
- `created_at` — account creation time.

**Events**
- `id` — primary key.
- `name` — event name.
- `venue` — event location.
- `starts_at` — event start time.
- `status` — draft, on sale, or closed.

**Seats**
- `id` — primary key.
- `event_id` — foreign key referencing Events.
- `seat_label` — seat label within the event.
- `price` — ticket price.
- `status` — available, held, or sold.
- `hold_expires_at` — expiration time for a temporary hold.

A unique constraint on `(event_id, seat_label)` ensures a seat label is not duplicated for the same event.

**Orders**
- `id` — primary key.
- `user_id` — foreign key referencing Users.
- `status` — pending, payment pending, confirmed, failed, or cancelled.
- `idempotency_key` — unique key for safely retrying an order request.
- `created_at` — order creation time.

**Order_Items**
- `id` — primary key.
- `order_id` — foreign key referencing Orders.
- `seat_id` — foreign key referencing Seats.
- `price_at_purchase` — price recorded when the purchase is confirmed.

A unique constraint on `seat_id` in Order_Items prevents the same seat record from being assigned to multiple order items. This design assumes one seat record represents one event's physical seat.

**Seat_Holds**
- `id` — primary key.
- `user_id` — foreign key referencing Users.
- `seat_id` — foreign key referencing Seats.
- `hold_token` — unique hold identifier.
- `expires_at` — expiration time.
- `status` — active, expired, released, or converted.

A database rule or transaction-controlled locking strategy ensures that only one active hold can claim a seat at a time. Expired holds must be released safely before a new hold is granted.

### Relationships

- One user can create many orders.
- One event has many seats.
- One order can contain multiple order items.
- Each order item refers to one seat.
- A seat can have successive holds over time, but only one active hold or confirmed sale at a time.

### Example SQL constraints

```sql
CREATE TABLE events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    venue TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL
);

CREATE TABLE seats (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id),
    seat_label TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    status TEXT NOT NULL DEFAULT 'available',
    hold_expires_at TIMESTAMPTZ,
    UNIQUE (event_id, seat_label)
);

CREATE TABLE order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    seat_id BIGINT NOT NULL UNIQUE REFERENCES seats(id),
    price_at_purchase NUMERIC(10, 2) NOT NULL
        CHECK (price_at_purchase >= 0)
);
```

The `orders` table must be created before `order_items`. The `users` and `orders` table definitions are omitted here for brevity but must include the fields described above in a full implementation. In production, foreign keys, status checks, and indexes should be added to all relevant tables.

### Preventing two people from buying the same seat

Seat correctness is the highest priority. A seat being shown as available in the browser does not guarantee it will still be available when a purchase request arrives.

The server uses this process:

1. Start a database transaction.
2. Lock the requested seat row using `SELECT ... FOR UPDATE`.
3. Check that the seat is not sold and that any previous hold has expired or been released.
4. If available, create a hold and set its expiration time.
5. Commit the transaction. If unavailable, roll back and return `409 Conflict`.
6. When payment succeeds, use another transaction to verify that the hold remains valid, mark the seat sold, create the order item, and confirm the order.
7. Commit the sale only if all relevant checks and database constraints succeed.

If two customers request the same seat simultaneously, the database serializes their conflicting transactions. The second customer must wait for the first transaction and then recheck availability. If the first customer obtains the hold, the second request fails.

The unique constraint on `order_items.seat_id` acts as an additional safeguard against duplicate sales. All code paths that create holds or confirm purchases must follow the same locking and transaction rules.

Payment should not be processed as an unprotected, long-running database transaction. Instead, reserve seats for a limited period, call the payment provider, and finalize or release the reservation using idempotent state transitions. Handle delayed payment results and expired holds carefully so a late payment cannot silently sell an already released seat.

## 5. Architecture

### Architecture diagram

```text
                       Customers
                           |
                    DNS / HTTPS / CDN
                           |
                     Load Balancer
                           |
              +------------+------------+
              |                         |
         App Server A              App Server B
              |                         |
              +------------+------------+
                           |
                  API / Queue Admission
                           |
             +-------------+-------------+
             |                           |
        Cache / Redis              Queue / Workers
             |                           |
             |                    Notifications,
             |                    hold expiry,
             |                    background tasks
             |
       +-----+-------------------------+
       |                               |
 Primary Relational DB ---------> Read Replica
 (seat locks, orders,             (event browsing,
  transactions, constraints)       read-heavy queries)
       |
 Payment Provider
 (external payment service; asynchronous
  webhooks return payment results)
```

### Component explanations

- **DNS and HTTPS:** Direct customers to the service and encrypt traffic in transit.
- **CDN:** Caches public event images, stylesheets, scripts, and other static content close to customers. It should not cache private ticket data or authoritative seat availability.
- **Load balancer:** Distributes requests across multiple application servers and removes unhealthy instances.
- **Application servers:** Run API validation, authentication, event browsing, seat holds, order creation, and ticket access. Multiple instances support horizontal scaling.
- **Admission queue and waiting room:** During a major sale, place buyers in a controlled queue and admit requests at a rate the purchasing system can handle. Fairness policies, queue tokens, rate limits, and bot controls help protect the sale.
- **Cache / Redis:** Caches frequently requested public event details and other suitable data. Seat availability must be checked against the authoritative database before granting a hold.
- **Primary relational database:** Stores authoritative seat, hold, order, and payment states. Transactions, row locks, foreign keys, and unique constraints protect correctness.
- **Read replica:** Serves suitable read-heavy queries such as event listings. Replication can lag, so it must not decide whether a seat can be sold.
- **Queue and workers:** Handle background work such as sending confirmations, processing payment webhooks, and expiring holds. Jobs must be retryable and idempotent.
- **Payment provider:** Processes payments securely. Signed webhooks and server-side verification communicate payment outcomes.

### How it survives a popular sale

The sale attracts 200,000 potential buyers in 10 minutes, or about 333 people per second on average. The waiting room absorbs bursts and limits the rate at which buyers reach the transactional purchasing path. Public event information is cached, static assets are served by the CDN, and read-heavy queries can use the read replica.

Only requests admitted by the queue reach the seat-hold workflow at the configured rate. The primary database remains the final authority for seat ownership. The system must never bypass database checks simply to improve speed.

Monitor queue length, request latency, database lock waits, error rates, payment outcomes, and hold expiry. If the database or payment provider becomes unhealthy, pause or slow admissions rather than accepting unsafe purchases. Multiple application instances and health checks reduce the impact of an application-server failure. Database backups, tested recovery procedures, and appropriate database failover improve resilience.

## 6. Trade-offs

### Trade-off 1: Strong consistency versus performance

Using transactions, row locks, and uniqueness constraints protects customers from double-booking. However, concurrent purchases for the same seats may wait for database locks, increasing latency during a major sale.

**Decision:** Prioritize correctness for holds and purchases. Improve browsing performance with a CDN, cache, read replica, and waiting room instead of weakening seat-sale consistency.

### Trade-off 2: Fairness versus immediate access

A waiting room controls overload and makes it harder for bots to overwhelm the service. However, customers may have to wait, and strict first-come-first-served processing can be difficult to guarantee across networks and distributed systems.

**Decision:** Use queue tokens, rate limits, transparent queue rules, and monitoring. Explain the process to customers and prevent users from gaining unfair advantages through repeated requests.

### Trade-off 3: Temporary holds versus seat utilization

Temporary holds give customers time to pay, but abandoned holds temporarily prevent other customers from buying those seats.

**Decision:** Use short, clearly communicated hold expirations and a reliable expiry worker. Ensure expired holds cannot overwrite a confirmed sale.

### Trade-off 4: Read replicas versus freshness

Read replicas improve event browsing capacity, but replication delay may show outdated seat availability.

**Decision:** Use replicas for suitable read-only browsing. Always verify availability and commit purchases against the primary database.

## Conclusion

TicketHub must scale to handle a sudden surge of customers without sacrificing correctness or fairness. The most important design decision is that the database—not the browser, cache, or waiting-room queue—authoritatively controls seat holds and sales. Transactions, row-level locking, uniqueness constraints, idempotent payment handling, controlled admission, caching, and horizontal scaling work together to provide a reliable ticket-buying experience.