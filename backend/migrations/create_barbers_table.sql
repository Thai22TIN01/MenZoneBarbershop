-- Create Barbers table (MenZoneBarber database)
-- Run this once before using BarberManager.

USE MenZoneBarber;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Barbers')
BEGIN
  CREATE TABLE Barbers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    BarberName NVARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Active',
    Image NVARCHAR(MAX) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
  );
  PRINT 'Barbers table created.';
END
ELSE
BEGIN
  PRINT 'Barbers table already exists.';
END
GO
