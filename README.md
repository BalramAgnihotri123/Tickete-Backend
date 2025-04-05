# **📦 Inventory Sync API Integration 📦**

### _Overview_
_The Inventory Sync API Integration is designed to keep product availability data up-to-date by interfacing with a new API partner. This ensures that customers have access to accurate inventory information._

## **1. API Deployment**

All APIs are live and accessible at:

**[Tickete Backend - Deployed on Render](https://tickete-backend.onrender.com)**

> **Note:** Since this is a free-tier deployment, the first request may take up to **1 minute** to initialize the system. However, subsequent requests will process at normal speed.

### Usage Instructions
- Ensure that the backend is up by making an initial request.
- Once the backend is active, subsequent API calls will have normal response times.

For detailed API documentation and endpoints, refer to the relevant sections below.

---

#### 📌 Additional Information
- **Hosting Platform:** Render
- **API Status:** Deployed & Live
- **Expected Latency (First Call):** ~60 seconds

For any issues or inquiries, feel free to reach out!

---

## **2. Database Schema**
1. **Product Model**
   - **Attributes:** Product ID, Name, Availability (by date), Time Slot Types.

2. **Slot Model**
   - **Attributes:** Slot ID, Start Time, End Time, Provider Slot ID, Availability, Pricing Details.

3. **Pax Model**
   - **Attributes:** Type, ID, Category, Availability Constraints.

4. **Pax Availability Model**
   - **Description:** Links Slots and Pax Types.
   - **Attributes:** Slot ID, Passenger Type ID, Remaining Availability, Pricing.

6. **CronJob Model**
   - **Attributes:** Job ID, Name, Schedule, Enabled/Disabled Status, Execution Logs.


_This design ensures that the inventory data remains accurate and up-to-date, with flexibility for manual overrides and robust error handling to maintain data integrity. If you need more detailed implementation guidance or specific code examples, feel free to ask!_


---

## **3. Inventory Synchronization Jobs**
1. **30-Day Inventory Sync**
   - **Schedule:** Daily at Midnight.
   - **Function:** Updates inventory for the next 30 days.
   - **Features:** Can be manually triggered, skips if disabled.

2. **7-Day Inventory Sync**
   - **Schedule:** Every 4 Hours.
   - **Function:** Updates inventory for the upcoming 7 days.
   - **Features:** Manually triggerable, checks enabled status.

3. **Same-Day Inventory Sync**
   - **Schedule:** Every 15 Minutes.
   - **Function:** Ensures real-time accuracy for the current day.
   - **Features:** Immediate execution possible, controlled via database settings.

---

## **4. Throttling, Queueing, and Rate-Limiting System**

---    
The system uses **Bottleneck**, a lightweight and robust rate limiter, to ensure controlled API calls with proper throttling. This is implemented to:  

- Maintain **one API call per 2 seconds** (`minTime: 2100ms` ensures a small buffer).  
- Prevent excessive load on external or internal services.  
- Implement **automatic queuing** for API requests beyond the allowed rate.  

### **Throttler Configuration**  
```typescript
private limiter = new Bottleneck({ minTime: 2100 });
```
- Ensures **one request per 2.1 seconds** (2100ms) per API call.  
- Excess requests are **queued automatically** and executed in order.  

#### *How It Works?*  

- When syncing product inventory, the function **queues API calls** for fetching inventory.  
- The `limiter.schedule()` method ensures that each request is executed **at least 2.1 seconds apart**.  
- The system processes **all queued requests** sequentially, preventing API rate limits or service overload.  

#### *Example Usage in Inventory Syncing* 

```typescript
const apiResponse = await this.limiter.schedule(() => 
    this.fetchInventory(productId, formattedDate)
);
```
- Instead of making **immediate API calls**, requests are queued and **executed one-by-one** with a 2-second delay.  
- Prevents concurrent calls from overwhelming the external API.  
---

### **Rate Limiting**  
- Rate limiting helps prevent API abuse by restricting the number of requests a client can make within a given time.

- It enhances security, ensures fair usage, and protects server resources from overload.

```typescript
ThrottlerModule.forRoot([{
  ttl: 60000, // 1 minute
  limit: 30, // Max 30 requests per minute
}]),
```
- Ensures a limit of **30 Requests per minute** for an API call.  
- Excess requests are **squashed** and error is thrown as:

```typescript
{
    "statusCode":429,
    "message":"ThrottlerException: Too Many Requests"
}
```

---

## **5. API ENDPOINTS** (__PREFIX:__ ```/api/v1 ```)

### Get All Products
**Endpoint:** `GET /products`

**Description:**
Retrieves a paginated list of products.

**Query Parameters:**
- `page` (optional, integer, default: 1) - The page number.
- `limit` (optional, integer, default: 10) - Number of products per page.

**Response:**
```json
{
  "data": [
    {
      "id": 14,
      "name": "Product Name",
      "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY"],
      "timeSlotType": "MULTI"
    }, ...
  ],
  "totalLength": 100,
  "page": 1,
  "limit": 10,
  "statusCode": 200
}
```

---

### Get Product by ID
**Endpoint:** `GET /products/:productId`

**Description:**
Fetches details of a specific product by its ID.

**Path Parameters:**
- `productId` (required, integer) - ID of the product.

**Response:**
```json
{
  "data": {
    "id": 14,
      "name": "Product Name",
      "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY"],
      "timeSlotType": "MULTI"
  },
  "statusCode": 200
}
```

---

### Get Available Dates for a Product
**Endpoint:** `GET /products/:productId/dates`

**Description:**
Retrieves available dates for a given product.

**Path Parameters:**
- `productId` (required, integer) - ID of the product.

**Response:**
```json
{
  "data": {
    "dates": [
      {
        "date": "2025-03-24",
        "price": {
          "finalPrice": 100,
          "originalPrice": 120,
          "currencyCode": "USD"
        }
      }, ...
    ]
  },
  "statusCode": 200
}
```

---

### Get Available Slots for a Product on a Specific Date
**Endpoint:** `GET /products/:productId/slots`

**Description:**
Fetches available slots for a specific product on a given date.

**Path Parameters:**
- `productId` (required, integer) - ID of the product.

**Query Parameters:**
- `date` (required, string) - Date in `YYYY-MM-DD` format.

**Response:**
```json
{
  "data": {
    "slots": [
      {
        "startTime": "10:00:00",
        "startDate": "2025-03-24",
        "remaining": 5,
        "paxAvailability": [
          {
            "type": "Adult",
            "name": "Standard Adult",
            "description": "Adult Ticket",
            "min": 1,
            "max": 10,
            "remaining": 5,
            "price": {
              "finalPrice": 100,
              "originalPrice": 120,
              "currencyCode": "USD"
            }
          }, ...
        ]
      }
    ]
  },
  "statusCode": 200
}
```

### ADMIN APIs

---

### GET `/admin/cron`
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
- **Description:** Fetch a paginated list of cron jobs.

### PUT `/admin/cron/toggle`
- **Body:**
  - `name` (string)
  - `status` (boolean)
- **Description:** Toggle the status of a specified cron job.

### GET `/admin/cron/trigger`
- **Query Parameters:**
  - `name` (string)
- **Description:** Trigger the execution of a specified cron job.

### GET `/admin/cron/sync`
- **Query Parameters:**
  - `daysToSync` (number, default: 1)
- **Description:** Sync cron jobs for the next X days.

---

Each API follows proper error handling, returning appropriate status codes and messages in case of failures.

---


## **6. Optimizations**
---
> _I have applied some of these optimizations already in the code_

### Avoid Blocking the Event Loop (Integrated)
* Use asynchronous functions (async/await) in your cron jobs to prevent blocking the main thread.

* Perform heavy computations in a separate worker process using BullMQ or worker threads.

### Use a Job Queue for Background Tasks (limiter integrated for External API calls, can be duplicated for cron-jobs)
* Instead of executing all cron jobs in-memory, use BullMQ or Bottleneck (limiter) (Redis-backed queues) to schedule and queue and manage jobs efficiently.

* This will ensure job retries, delayed execution, and better scalability.

```typescript
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('job-queue')
export class JobProcessor {
  @Process()
  async handleJob(job: Job) {
    console.log(`Processing job with data:`, job.data);
  }
}
```
### Monitoring and Alerts
 * Notifying users by Slack, email, or SMS in the event that jobs or APIs fail repeatedly.

* To track cron job execution timings and failures, use New Relic or Prometheus + Grafana.

### Cron Jobs with Dynamic Scheduling (partially integrated)

* Dynamically load cron jobs at runtime by storing them in a database.

* This makes it possible to create customizable cron schedules without changing the code.

### Caching for Faster Responses
Reduce the number of database requests by using Redis to cache frequently requested data. Use in-memory caching for data that is session-based.

Can use NestJS's Cache Interceptors to cache API responses.

Example:
```typescript
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';

@UseInterceptors(CacheInterceptor)
@Controller('products')
export class ProductsController {
  @Get()
  async getProducts() {
    return this.productService.findAll();
  }
}
```