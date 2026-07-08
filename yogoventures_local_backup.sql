-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: yogoventures
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `best_selling`
--

DROP TABLE IF EXISTS `best_selling`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `best_selling` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_name` varchar(255) NOT NULL,
  `image` varchar(500) DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `best_selling`
--

LOCK TABLES `best_selling` WRITE;
/*!40000 ALTER TABLE `best_selling` DISABLE KEYS */;
INSERT INTO `best_selling` VALUES (5,'Polo Apperal','1783419022623-abcd4c387af2d88a.png','2026-07-07 10:10:22','2026-07-07 10:10:22'),(6,'Round Neck Apperal','1783419870067-b60935607b346b27.png','2026-07-07 10:24:30','2026-07-07 10:24:30'),(7,'Car Neck Rest Pillow','1783420245715-fb6f2706fb6eb0af.png','2026-07-07 10:30:45','2026-07-07 10:30:45'),(8,'Contour Pillow','1783420256772-24b066117e896f53.png','2026-07-07 10:30:56','2026-07-07 10:30:56'),(9,'Wedge Pillow','1783420269570-ec9931e5f07c226a.png','2026-07-07 10:31:09','2026-07-07 10:31:09'),(10,'Copper Water Container','1783421916117-3ca81848b024c5ec.png','2026-07-07 10:57:48','2026-07-07 10:58:36'),(11,'Copper Water Bottle','1783421933909-b9764e46e2e5acad.png','2026-07-07 10:58:53','2026-07-07 10:58:53'),(12,'Wooden Pen Holder','1783422064937-74bd54390e2e9bee.png','2026-07-07 11:01:04','2026-07-07 11:01:04');
/*!40000 ALTER TABLE `best_selling` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_master`
--

DROP TABLE IF EXISTS `category_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category_master` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_code` varchar(20) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_master`
--

LOCK TABLES `category_master` WRITE;
/*!40000 ALTER TABLE `category_master` DISABLE KEYS */;
INSERT INTO `category_master` VALUES (8,'CAT-001','Apparel','2026-07-07 06:37:32','2026-07-07 06:37:32'),(9,'CAT-002','Memory Foam Products','2026-07-07 06:37:44','2026-07-07 06:37:44'),(10,'CAT-003','Copper Utensils','2026-07-07 06:38:02','2026-07-07 06:38:02'),(11,'CAT-004','Handicraft Items','2026-07-07 06:38:38','2026-07-07 06:38:38');
/*!40000 ALTER TABLE `category_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_us_enquiry`
--

DROP TABLE IF EXISTS `contact_us_enquiry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contact_us_enquiry` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email_id` varchar(255) NOT NULL,
  `country` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `status` enum('Pending','Mark as Done') DEFAULT 'Pending',
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_us_enquiry`
--

LOCK TABLES `contact_us_enquiry` WRITE;
/*!40000 ALTER TABLE `contact_us_enquiry` DISABLE KEYS */;
INSERT INTO `contact_us_enquiry` VALUES (2,'Chandru','K','Chandrukannan761@gmail.com','America','9874561230','Testing process','Testing','Mark as Done','2026-07-02 15:47:28','2026-07-08 07:31:48'),(3,'Chandru','K','Chandrukannan761@gmail.com','London','9874561230','Testing process','Summa','Mark as Done','2026-07-02 15:49:46','2026-07-08 07:31:48'),(4,'Chandru','K','abc@gmail.com','London','9751404595','Confetti Testing process','Confetti Testing','Mark as Done','2026-07-02 15:57:57','2026-07-08 07:31:48'),(7,'Vignesh','N','vigneshgvt@outlook.com','Dubai','963852741','Developer','Yogo Ventures Backend Testing process','Pending','2026-07-03 09:19:47','2026-07-08 07:31:48'),(8,'Chandru','K','abc@gmail.com','London','9751404595','English','Test','Pending','2026-07-06 06:25:49','2026-07-08 07:31:48'),(9,'Local','DeployTest','test@example.com','India','1234567890','Local Deploy Test','Verifying public create endpoint during local deployment','Pending','2026-07-08 07:36:55','2026-07-08 07:36:55');
/*!40000 ALTER TABLE `contact_us_enquiry` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `country_master`
--

DROP TABLE IF EXISTS `country_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `country_master` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `country_code` varchar(10) NOT NULL,
  `country_name` varchar(100) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `country_code` (`country_code`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `country_master`
--

LOCK TABLES `country_master` WRITE;
/*!40000 ALTER TABLE `country_master` DISABLE KEYS */;
INSERT INTO `country_master` VALUES (17,'UK','London','2026-07-02 13:37:06','2026-07-02 13:37:06'),(18,'US','America','2026-07-02 13:37:25','2026-07-02 13:37:25'),(21,'UAE','Dubai','2026-07-03 07:11:07','2026-07-03 07:11:07');
/*!40000 ALTER TABLE `country_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_master`
--

DROP TABLE IF EXISTS `customer_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_master` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(50) NOT NULL DEFAULT '',
  `customer_name` varchar(255) NOT NULL,
  `email_id` varchar(255) NOT NULL,
  `country` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_master`
--

LOCK TABLES `customer_master` WRITE;
/*!40000 ALTER TABLE `customer_master` DISABLE KEYS */;
INSERT INTO `customer_master` VALUES (1,'','John Doe','john@example.com','India','9876543210','2026-07-02 18:49:02','2026-07-02 18:49:02');
/*!40000 ALTER TABLE `customer_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enquiries`
--

DROP TABLE IF EXISTS `enquiries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `enquiries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email_id` varchar(255) NOT NULL,
  `country` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `product_category` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `status` enum('Pending','Mark as Done') DEFAULT 'Pending',
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enquiries`
--

LOCK TABLES `enquiries` WRITE;
/*!40000 ALTER TABLE `enquiries` DISABLE KEYS */;
INSERT INTO `enquiries` VALUES (3,'Chandru','K','Chandrukannan761@gmail.com','Dubai','+916385913643','Electronics','Testing process','Pending','2026-07-06 09:21:27','2026-07-08 07:31:48'),(4,'Web','Tester','webtest@example.com','India','9999999999','Apparel','Local deploy general enquiry test','Pending','2026-07-08 07:41:24','2026-07-08 07:41:24');
/*!40000 ALTER TABLE `enquiries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `get_enquire_quote`
--

DROP TABLE IF EXISTS `get_enquire_quote`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `get_enquire_quote` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_name` varchar(255) NOT NULL,
  `qty` int(11) NOT NULL,
  `color` varchar(100) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email_id` varchar(255) NOT NULL,
  `country` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `message` text DEFAULT NULL,
  `status` enum('Pending','Mark as Done') DEFAULT 'Pending',
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `get_enquire_quote`
--

LOCK TABLES `get_enquire_quote` WRITE;
/*!40000 ALTER TABLE `get_enquire_quote` DISABLE KEYS */;
INSERT INTO `get_enquire_quote` VALUES (2,'Polo Apparel ×200 [Black (#1B1B1B) ×100, Purple (#7E29B4) ×100]',200,'Black, Purple','Chandru','K','Chandrukannan761@gmail.com','London','+916385913643','Hello,\n\nI would like to request a quotation for the following product:\n\n**Product Name:** Polo Apparel T-Shirt\n**Color:** Black & Purple\n**Quantity:** 100 Pieces\n\nKindly provide the following details:\n\n* Unit Price\n* Bulk Discount (if applicable)\n* GST Details\n* Shipping/Delivery Charges\n* Estimated Delivery Time\n* Payment Terms\n* Available Sizes\n* Fabric Specifications\n* Custom Logo/Printing Charges (if applicable)\n\nPlease send your best quotation at your earliest convenience.\n\nThank you. I look forward to your response.','Mark as Done','2026-07-06 07:04:17','2026-07-08 07:31:48'),(3,'Polo Apparel ×500 [Teal (#228C7D) ×250, Yellow (#F4CB49) ×250]',500,'Teal, Yellow','Chandru','K','Chandrukannan761@gmail.com','Dubai','+916385913643','Test','Pending','2026-07-06 13:42:42','2026-07-08 07:31:48'),(4,'Local Deploy Test Apparel Item',5,'Blue','Web','Tester','webtest@example.com','India','9999999999','Local deploy quote test','Pending','2026-07-08 07:41:24','2026-07-08 07:41:24');
/*!40000 ALTER TABLE `get_enquire_quote` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `new_arrivals`
--

DROP TABLE IF EXISTS `new_arrivals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `new_arrivals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_name` varchar(255) NOT NULL,
  `image` varchar(500) DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `new_arrivals`
--

LOCK TABLES `new_arrivals` WRITE;
/*!40000 ALTER TABLE `new_arrivals` DISABLE KEYS */;
INSERT INTO `new_arrivals` VALUES (3,'Hoodies','1783428592410-438882f2ea18d1ad.png','2026-07-07 12:49:52','2026-07-07 12:49:52'),(4,'Coccyx Cushion','1783429411100-2fa6a273e3184445.png','2026-07-07 13:03:31','2026-07-07 13:03:31'),(5,'Car Back Rest','1783429570515-7a3f5a03ac346f4b.png','2026-07-07 13:06:10','2026-07-07 13:06:10'),(6,'Copper Thali Set','1783429671051-d7e2fe098fa7fffc.png','2026-07-07 13:07:51','2026-07-07 13:07:51'),(7,'Laptop Sleeves','1783429834253-45102711009ae2ff.png','2026-07-07 13:10:34','2026-07-07 13:10:34');
/*!40000 ALTER TABLE `new_arrivals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_tracking`
--

DROP TABLE IF EXISTS `order_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_tracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(100) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `order_placed_date` date DEFAULT NULL,
  `product_initiated_date` date DEFAULT NULL,
  `inspection_initiated_date` date DEFAULT NULL,
  `certification_in_progress_date` date DEFAULT NULL,
  `packing_in_progress_date` date DEFAULT NULL,
  `shipped_from_manufacturer_date` date DEFAULT NULL,
  `in_yogo_warehouse_date` date DEFAULT NULL,
  `shipped_from_yogo_date` date DEFAULT NULL,
  `customer_clearance_date` date DEFAULT NULL,
  `bill_of_loading_date` date DEFAULT NULL,
  `sold_on_date` date DEFAULT NULL,
  `reached_destination_date` date DEFAULT NULL,
  `customer_clearance_destination_date` date DEFAULT NULL,
  `reached_customer_warehouse_date` date DEFAULT NULL,
  `order_complete_date` date DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_order_tracking_customer` (`customer_id`),
  CONSTRAINT `fk_order_tracking_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer_master` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_tracking`
--

LOCK TABLES `order_tracking` WRITE;
/*!40000 ALTER TABLE `order_tracking` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_master`
--

DROP TABLE IF EXISTS `product_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_master` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_code` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `sub_category_name` varchar(100) NOT NULL,
  `product_description` text DEFAULT NULL,
  `index_image` varchar(500) DEFAULT NULL,
  `image1` varchar(500) DEFAULT NULL,
  `image2` varchar(500) DEFAULT NULL,
  `image3` varchar(500) DEFAULT NULL,
  `image4` varchar(500) DEFAULT NULL,
  `image5` varchar(500) DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_master`
--

LOCK TABLES `product_master` WRITE;
/*!40000 ALTER TABLE `product_master` DISABLE KEYS */;
INSERT INTO `product_master` VALUES (2,'PROD001','Polo Apperal','Apparel','Polo Apperal','Test','1783419014345-e5ca35c455d5cdce.png','','','','','','2026-07-07 10:10:14','2026-07-07 10:10:14'),(3,'PROD001','Round Neck Apperal','Apparel','Round Neck Apperal','Test','1783419860074-816c83b37855de78.png','','','','','','2026-07-07 10:24:20','2026-07-07 10:24:20'),(4,'PROD003','Car Neck Rest Pillow','Memory Foam Products','Car Neck Rest Pillow','Test','1783420134155-0f76f332fc55391c.png','','','','','','2026-07-07 10:28:54','2026-07-07 10:28:54'),(5,'PROD004','Contour Pillow','Memory Foam Products','Contour Pillow','Test','1783420164118-9bb20678e3b49ead.png','','','','','','2026-07-07 10:29:24','2026-07-07 10:29:24'),(6,'PROD006','Wedge Pillow','Memory Foam Products','Wedge Pillow','Test','1783420206144-6315f384f24524d9.png','','','','','','2026-07-07 10:30:06','2026-07-07 10:30:06'),(7,'PROD006','Copper Water Container','Copper Utensils','Copper Water Container','Test','1783421674849-3a2ac5a8f3a03ba0.png','','','','','','2026-07-07 10:54:34','2026-07-07 10:54:34'),(8,'PROD007','Copper Water Bottle','Copper Utensils','Copper Water Container','Test','1783421850111-60f79a485c613ae6.png','','','','','','2026-07-07 10:57:30','2026-07-07 10:57:30'),(9,'PROD008','Wooden Pen Holder','Handicraft Items','Wooden Handicrafts','Test','1783422044574-beb70ec1a676295b.png','','','','','','2026-07-07 11:00:44','2026-07-07 11:00:44'),(10,'PROD009','Hoodies','Apparel','Hoodies','Test','1783428337451-6486dc97cb1090ef.png','','','','','','2026-07-07 12:45:37','2026-07-07 13:09:14'),(11,'PROD010','Coccyx Cushion','Memory Foam Products','Coccyx Cushion','Test','1783429397123-d5be6dc157ae080f.png','','','','','','2026-07-07 13:03:17','2026-07-07 13:09:21'),(12,'PROD011','Car Back Rest','Memory Foam Products','Car Back Rest','Test','1783429557151-150aa7bcc9725c1a.png','','','','','','2026-07-07 13:05:57','2026-07-07 13:09:27'),(13,'PROD012','Copper Thali Set','Copper Utensils','Copper Thali Set','Test','1783429661340-1915d6754dae723a.png','','','','','','2026-07-07 13:07:41','2026-07-07 13:09:05'),(14,'PROD013','Laptop Sleeves','Handicraft Items','Handmade Hand Bags','Test','1783429824941-c854cc72a60c212d.png','','','','','','2026-07-07 13:10:24','2026-07-07 13:10:24');
/*!40000 ALTER TABLE `product_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sub_category_master`
--

DROP TABLE IF EXISTS `sub_category_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sub_category_master` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sub_category_code` varchar(20) NOT NULL,
  `sub_category_name` varchar(100) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sub_category_master`
--

LOCK TABLES `sub_category_master` WRITE;
/*!40000 ALTER TABLE `sub_category_master` DISABLE KEYS */;
INSERT INTO `sub_category_master` VALUES (10,'SUB001','Polo Apperal','Apparel','2026-07-07 10:08:36','2026-07-07 10:08:36'),(11,'SUB002','Round Neck Apperal','Apparel','2026-07-07 10:08:53','2026-07-07 10:08:53'),(12,'SUB003','Hoodies','Apparel','2026-07-07 10:09:04','2026-07-07 10:09:04'),(13,'SUB004','Car Neck Rest Pillow','Memory Foam Products','2026-07-07 10:26:04','2026-07-07 10:26:04'),(14,'SUB004','Contour Pillow','Memory Foam Products','2026-07-07 10:26:29','2026-07-07 10:26:29'),(15,'SUB007','Wedge Pillow','Memory Foam Products','2026-07-07 10:26:43','2026-07-07 10:26:43'),(16,'SUB001','Copper Water Container','Copper Utensils','2026-07-07 10:53:43','2026-07-07 10:53:43'),(17,'SUB008','Copper Water Bottle','Copper Utensils','2026-07-07 10:56:37','2026-07-07 10:56:37'),(18,'SUB009','Wooden Handicrafts','Handicraft Items','2026-07-07 11:00:08','2026-07-07 11:00:08'),(19,'SUB010','Coccyx Cushion','Memory Foam Products','2026-07-07 13:02:43','2026-07-07 13:02:43'),(20,'SUB011','Car Back Rest','Memory Foam Products','2026-07-07 13:05:14','2026-07-07 13:05:14'),(21,'SUB012','Copper Thali Set','Copper Utensils','2026-07-07 13:07:05','2026-07-07 13:07:05'),(22,'SUB013','Handmade Hand Bags','Handicraft Items','2026-07-07 13:08:37','2026-07-07 13:08:37');
/*!40000 ALTER TABLE `sub_category_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `email_id` varchar(255) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `role` varchar(20) NOT NULL DEFAULT 'admin',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_id` (`email_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Local Admin','admin@yogoventures.local',NULL,'$2b$10$YyyZCGn7fnjI2QoG1xv7T.9awo8sxejanAlRQWD9F5uWXI1S2iK3a','2026-07-08 07:32:53','2026-07-08 07:32:53','admin','active');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-08 17:52:52
