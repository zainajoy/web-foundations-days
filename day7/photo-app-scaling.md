# SnapShare: Photo App Scaling Plan

## 1. Assumptions

This plan uses the following assumptions:

- SnapShare has 10 million registered users.
- 10% of registered users are active each day.
- Each daily active user uploads one original photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo averages 2 MB.
- Each photo also has one thumbnail averaging 50 KB.
- A day contains 86,400 seconds, and a year contains 365 days.
- Daily activity is spread evenly across the day for average-rate calculations.
- Peak feed traffic is five times the average rate.
- Storage calculations use decimal units: 1 TB = 1,000 GB and 1 GB = 1,000 MB.
- The estimates exclude backups, replication, temporary files, and other storage overhead.

## 2. Traffic and Storage Estimates

### Daily active users

Daily active users = Registered users × Daily activity percentage

10,000,000 × 10% = **1,000,000 daily active users**

### Photo uploads per second

Daily uploads = 1,000,000 users × 1 photo

Daily uploads = 1,000,000 photos

Average uploads per second = 1,000,000 ÷ 86,400

Average uploads per second ≈ **11.57**, or about 12 uploads per second.

### Feed views per second

Daily feed views = 1,000,000 users × 50 pages

Daily feed views = 50,000,000 pages

Average feed views per second = 50,000,000 ÷ 86,400

Average feed views per second ≈ **579**.

Peak feed views per second = 579 × 5

Peak feed views per second ≈ **2,894**.

These are estimates; real traffic may be uneven and may have higher short-lived peaks.

### Storage per year

Original photos:

- Daily original-photo storage = 1,000,000 × 2 MB = 2,000,000 MB = 2 TB.
- Annual original-photo storage = 2 TB × 365 = **730 TB**.

Thumbnails:

- Daily thumbnail storage = 1,000,000 × 50 KB = 50,000,000 KB = 50 GB.
- Annual thumbnail storage = 50 GB × 365 = **18.25 TB**.

Total annual photo-file storage:

730 TB + 18.25 TB = **748.25 TB per year**.

This is new storage added each year, assuming every uploaded photo and its thumbnail are retained. It excludes backups, replicas, database storage, and other overhead.

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is **read-heavy** because each active user views 50 feed pages per day but uploads only one photo per day. This creates many more feed requests than photo uploads.

The design should optimise feed reads using a CDN for cached images, an application-level cache for frequently requested data, multiple application servers, and a database read replica for suitable read queries. Uploads must still be reliable, but read performance is the main scaling priority.

## 4. Architecture Diagram

```text
                         USERS
                           |
                           v
                    +-------------+
                    |     CDN     |
                    | Cached      |
                    | thumbnails  |
                    | and photos  |
                    +-------------+
                           |
                           v
                    +-------------+
                    | Load        |
                    | Balancer    |
                    +-------------+
                           |
                +----------+----------+
                |          |          |
                v          v          v
           +---------+ +---------+ +---------+
           | App     | | App     | | App     |
           | Server  | | Server  | | Server  |
           +---------+ +---------+ +---------+
                |          |          |
                +----------+----------+
                           |
             +-------------+-------------+
             |                           |
             v                           v
       +-------------+             +-------------+
       | Cache       |             | Primary DB  |
       | Feed data   |             | Users,      |
       | and metadata|             | follows,    |
       +-------------+             | photo data  |
                                   +-------------+
                                         |
                                         | Replication
                                         v
                                   +-------------+
                                   | Read Replica|
                                   | Feed reads  |
                                   +-------------+

 Upload processing:
 App Server
     |
     +-----------------------> Object Storage
     |                         Original photos
     |
     +-----------------------> Queue
                                  |
                                  v
                             +-------------+
                             | Thumbnail   |
                             | Worker      |
                             +-------------+
                                  |
                                  v
                             Object Storage
                             Thumbnails
                                  |
                                  v
                                 CDN
```

## 5. What Each Component Solves

- **CDN:** Delivers cached photos and thumbnails from locations closer to users, reducing latency and repeated requests to the application.
- **Load balancer:** Distributes incoming requests across application servers so one server does not handle all the traffic.
- **Application servers:** Handle business logic, authentication, upload coordination, feed requests, and API responses.
- **Cache:** Stores frequently accessed feed data and photo metadata to reduce repeated database queries.
- **Primary database:** Stores structured information such as users, follow relationships, photo metadata, and upload records.
- **Read replica:** Serves suitable read queries to reduce load on the primary database, while replication may introduce a short delay before new data appears.
- **Object storage:** Stores the original photo files and thumbnails separately from the relational database, allowing large amounts of media to be stored and retrieved efficiently.
- **Queue:** Holds thumbnail-generation jobs so uploads do not need to wait for image processing to finish.
- **Thumbnail worker:** Processes queued jobs, generates smaller thumbnail images, and saves them to object storage.

## 6. Why Photos Should Not Be Stored Inside the Database

Photo files are large, and storing them directly in the database would increase database size, backup times, and the cost of serving media. Instead, original photos and thumbnails should be stored in object storage. The database should store metadata such as the photo ID, owner, caption, upload time, and object-storage key. This keeps structured data queries efficient and allows photo delivery to scale independently through object storage and the CDN.

## 7. Photo Upload Flow

1. A user selects a photo in the application.
2. The application server authenticates the user and validates the upload, including its file type and size.
3. The server arranges for the original photo to be uploaded to object storage and obtains its storage key. For large uploads, the client could use a secure, short-lived pre-signed upload URL.
4. The application records the photo metadata and storage key in the primary database.
5. The application places a thumbnail-generation job on the queue.
6. The server confirms that the upload has been accepted, without waiting for thumbnail generation to finish.
7. A thumbnail worker retrieves the job and reads the original photo from object storage.
8. The worker resizes the image, generates a thumbnail, and saves it to object storage.
9. The worker updates the photo's processing status in the database, if status tracking is implemented.
10. The CDN can deliver the original photo or thumbnail when users request it; cache entries should be refreshed or versioned when needed.

The queue allows thumbnail processing to happen asynchronously and can retry failed jobs without requiring the user to upload the photo again.

## 8. Trade-Offs

### Trade-off 1: CDN caching versus freshness

A CDN reduces latency and origin traffic because popular images can be served from cache. However, cached content may not reflect changes immediately. Cache expiration, invalidation, or versioned image URLs can help balance speed and freshness.

### Trade-off 2: Read replicas versus consistency

A read replica reduces the load on the primary database and supports more read traffic. However, replication can lag, meaning a user may not immediately see a newly uploaded photo or an updated record when a feed request is served by the replica. Reads that require the latest data can temporarily use the primary database.

### Trade-off 3: Asynchronous thumbnails versus immediate availability

A queue lets the application confirm an upload without waiting for thumbnail processing, improving responsiveness. However, the thumbnail may not be available immediately, and workers need retries, monitoring, and failure handling.

### Trade-off 4: Object storage versus operational simplicity

Object storage scales well for large photo files and separates media delivery from database operations. However, the application must manage storage keys, permissions, upload failures, and cleanup of files that are no longer referenced by database records.

## 9. Conclusion

SnapShare should use a horizontally scalable application tier, a CDN, caching, a primary database with a read replica, object storage, and asynchronous thumbnail processing. Based on the assumptions, it must support about 12 uploads per second on average, around 579 feed views per second on average, and around 2,894 feed views per second at peak. It should plan for approximately 748.25 TB of additional photo-file storage per year before overhead.
