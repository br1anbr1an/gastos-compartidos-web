-- Active: 1771039962984@@127.0.0.1@5432@shared_expenses_db

-- Users Table
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS categories;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('in_progress', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Expenses Table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Seed Data
INSERT INTO users (name, email) VALUES 
('Brian', 'brian@example.com'),
('Jos', 'jos@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO projects (name, status) VALUES 
('Gastos Generales', 'in_progress')
ON CONFLICT DO NOTHING;

INSERT INTO categories (name) VALUES 
('Despensa'),
('Restaurantes'),
('Michis'),
('Transporte'),
('Mantenimiento Auto'),
('Mantenimiento Casa'),
('Salud'),
('Regalos'),
('Gasolina'),
('Servicios'),
('Otros')
ON CONFLICT DO NOTHING;