CREATE DATABASE IF NOT EXISTS property_db;
USE property_db;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','buyer','seller') NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  seller_id   INT NOT NULL,
  title       VARCHAR(150) NOT NULL,
  type        ENUM('house','apartment','shop','plot') NOT NULL,
  price       BIGINT NOT NULL,
  city        VARCHAR(80) NOT NULL,
  area_size   VARCHAR(40),
  beds        TINYINT NULL,
  baths       TINYINT NULL,
  description TEXT,
  image       LONGTEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id     INT NOT NULL,
  property_id INT NOT NULL,
  PRIMARY KEY (user_id, property_id),
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);
