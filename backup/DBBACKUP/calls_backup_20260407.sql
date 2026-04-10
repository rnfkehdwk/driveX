/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.16-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: drivelog_db
-- ------------------------------------------------------
-- Server version	10.11.16-MariaDB-ubu2204

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
-- Table structure for table `calls`
--

DROP TABLE IF EXISTS `calls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `calls` (
  `call_id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL COMMENT '콜 생성자 (SUPER_ADMIN)',
  `status` enum('WAITING','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'WAITING',
  `customer_id` int(11) DEFAULT NULL,
  `partner_id` int(11) DEFAULT NULL,
  `start_address` varchar(500) DEFAULT NULL,
  `start_detail` varchar(200) DEFAULT NULL,
  `end_address` varchar(500) DEFAULT NULL COMMENT 'NULL이면 미정',
  `end_detail` varchar(200) DEFAULT NULL,
  `estimated_fare` int(11) DEFAULT NULL COMMENT '예상 요금',
  `payment_method` varchar(20) DEFAULT 'CASH',
  `memo` varchar(500) DEFAULT NULL COMMENT '관리자 메모',
  `assigned_rider_id` int(11) DEFAULT NULL COMMENT '수락한 기사',
  `assigned_at` datetime DEFAULT NULL,
  `ride_id` int(11) DEFAULT NULL COMMENT '연결된 운행일지',
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancel_reason` varchar(200) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`call_id`),
  KEY `idx_calls_company_status` (`company_id`,`status`),
  KEY `idx_calls_rider` (`assigned_rider_id`),
  KEY `idx_calls_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calls`
--

LOCK TABLES `calls` WRITE;
/*!40000 ALTER TABLE `calls` DISABLE KEYS */;
INSERT INTO `calls` VALUES
(1,3,8,'COMPLETED',NULL,NULL,'강원도 양양군 양양읍 남문로 123','양양마트 앞','강원도 속초시 중앙로 456','속초해수욕장',30000,'CASH','요금 수정됨',32,'2026-03-27 00:07:51',1248,'2026-03-27 00:08:04',NULL,NULL,'2026-03-27 00:07:03','2026-03-27 00:08:04'),
(2,3,8,'CANCELLED',NULL,NULL,'양양군 손양면 학포리',NULL,NULL,NULL,15000,'CARD','도착지 미정',NULL,NULL,NULL,NULL,'2026-03-27 00:08:52','관리자 테스트 취소','2026-03-27 00:07:03','2026-03-27 00:08:52'),
(3,3,8,'COMPLETED',NULL,NULL,'강원도 양양군 양양읍 남문리 123','양양터미널 앞','강원도 양양군 손양면 학포리',NULL,30000,'CASH','수정된 테스트 콜',32,'2026-03-27 23:47:20',NULL,'2026-03-27 23:47:20',NULL,NULL,'2026-03-27 23:47:20','2026-03-27 23:47:20'),
(4,3,8,'CANCELLED',NULL,NULL,'취소 테스트',NULL,NULL,NULL,10000,'CARD',NULL,NULL,NULL,NULL,NULL,'2026-03-27 23:47:21','SA 테스트 취소','2026-03-27 23:47:20','2026-03-27 23:47:21'),
(5,3,8,'CANCELLED',NULL,NULL,'배포검증 콜',NULL,NULL,NULL,15000,'CASH',NULL,NULL,NULL,NULL,NULL,'2026-04-02 21:16:59','배포검증 정리','2026-04-02 21:16:59','2026-04-02 21:16:59'),
(6,3,8,'COMPLETED',NULL,NULL,'크로스테스트 출발',NULL,'크로스테스트 도착',NULL,25000,'CASH','크로스 시나리오 테스트',32,'2026-04-02 23:10:18',1254,'2026-04-02 23:10:18',NULL,NULL,'2026-04-02 23:10:18','2026-04-02 23:10:18');
/*!40000 ALTER TABLE `calls` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-07 10:28:13
