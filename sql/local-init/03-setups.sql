
CREATE TABLE `planetSetupStorage` (
	`hashKey` int(11) NOT NULL,
	`setup` text,
	`lastRefreshDate` date,
	`persists` boolean,
	`version` int(5),
  PRIMARY KEY (`hashKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
