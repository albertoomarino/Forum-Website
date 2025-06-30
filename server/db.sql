BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "users" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "username" VARCHAR(20) NOT NULL UNIQUE,
  "salt" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "admin" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "title" VARCHAR(100) NOT NULL UNIQUE,
  "userId" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "maxComments" INTEGER,
  "date" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users("id")
);

CREATE TABLE IF NOT EXISTS "comments" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "text" TEXT NOT NULL,
  "date" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "userId" INTEGER,
  "postId" INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users("id"),
  FOREIGN KEY (postId) REFERENCES posts("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "interesting_flags" (
  "userId" INTEGER NOT NULL,
  "commentId" INTEGER NOT NULL,
  PRIMARY KEY (userId, commentId),
  FOREIGN KEY (userId) REFERENCES users("id"),
  FOREIGN KEY (commentId) REFERENCES comments("id") ON DELETE CASCADE
);

INSERT INTO "users" VALUES (1, 'alberto', '123348dusd437840', '451f285506c0b237317244eb8fb57ea736cb9693b4b329e300bcfec4d63485ca', 'LXBSMDTMSP2I5XFXIYRGFVWSFI', 1);
INSERT INTO "users" VALUES (2, 'bob', '7732qweydg3sd637', '0a9580050849c541807e5778b7f0410569832414ceaf9a17054666206beb0fd7', 'LXBSMDTMSP2I5XFXIYRGFVWSFI', 1);
INSERT INTO "users" VALUES (3, 'carl', 'wgb32sge2sh7hse7', 'c56467cd69169df291e9267ebde0bc152a8e822ee0ca38944bb901ed0a720708', '', 0);
INSERT INTO "users" VALUES (4, 'diana', 'safd6523tdwt82et', '0cd67adcdcd0b48c2441c10c53e476036ffd263f63f1c855fd06e0767b65c145', '', 0);
INSERT INTO "users" VALUES (5, 'emma',  'ad37JHUW38wj2833', 'ceecfec4323954e7ab79427ac9ca86fc3ba54a4bfbc44aa6c336935f898744af', '', 0);

INSERT INTO "posts" VALUES (1, 'The Quantum Leap in Computing', 1, 'The future of technology is about to get a major upgrade. Quantum computing promises to solve problems currently intractable for even the most powerful supercomputers. From drug discovery to financial modeling, the potential applications are mind-boggling. Are we ready for this paradigm shift?', 4, '2015-01-01 10:21:27');
INSERT INTO "posts" VALUES (2, 'Deciphering Dark Matter', 1, 'The universe holds many secrets, and dark matter is one of the biggest. While we cannot see it, its gravitational effects are undeniable. Scientists worldwide are racing to detect and understand this mysterious substance, which makes up about 27% of the universe. What if we finally crack the code?', 9, '2013-01-02 09:53:01');  
INSERT INTO "posts" VALUES (3, 'The Ethical Dilemmas of AI', 2, 'As AI becomes more sophisticated, so do the ethical questions surrounding it. Who is responsible when an AI makes a mistake? How do we ensure fairness and prevent bias in algorithms? These aren not just theoretical debates; they are becoming pressing societal challenges we need to address now.', NULL, '2014-01-03 19:44:02'); 
INSERT INTO "posts" VALUES (4, 'Unveiling the Oceans Depths', 2, 'Our oceans are vast and largely unexplored, hiding countless species and geological wonders. New deep-sea technologies are allowing us to venture further than ever before, revealing ecosystems that thrive without sunlight and shedding light on Earth own history. What incredible discoveries await us?', 12, '2011-01-03 20:54:27');
INSERT INTO "posts" VALUES (5, 'Genetic Engineering: Promise and Peril', 3, 'CRISPR technology has revolutionized genetic engineering, offering the potential to cure diseases and enhance human traits. But with great power comes great responsibility. The ability to alter our very blueprint raises profound ethical and societal questions. Where do we draw the line?', 5, '2012-01-01 18:43:27');
INSERT INTO "posts" VALUES (6, 'The Science of Sleep', 3, 'Sleep is not just about resting; it is a vital biological process essential for physical and mental health. Research is continuously uncovering the intricate mechanisms behind sleep, revealing its role in memory consolidation, emotional regulation, and even cellular repair. Prioritizing sleep is truly a scientific imperative!', 5, '2015-02-04 06:16:59');  
INSERT INTO "posts" VALUES (7, 'Exoplanets: Searching for Life Beyond Earth', 4, 'The discovery of thousands of exoplanets has ignited the search for extraterrestrial life. Telescopes like James Webb are analyzing distant atmospheres for biosignatures chemical hints of life. The possibility of finding another inhabited world is no longer just science fiction.', NULL, '2012-04-06 23:14:55'); 
INSERT INTO "posts" VALUES (8, 'The Future of Renewable Energy', 4, 'Tackling climate change requires a rapid transition to renewable energy. Solar, wind, and geothermal technologies are constantly improving, becoming more efficient and affordable. The challenge now is scaling these solutions globally and integrating them into existing energy grids. The future is bright, and its powered by renewables!', NULL, '2013-04-06 22:44:11');
INSERT INTO "posts" VALUES (9, 'Bio-inspiration: Learning from Nature', 5, 'Nature is the ultimate engineer. Scientists and engineers are increasingly turning to biological systems for inspiration, developing new materials, robots, and technologies based on principles observed in plants, animals, and even microorganisms. From gecko-inspired adhesives to self-healing materials, nature provides endless brilliant ideas.', 4, '2014-09-23 16:55:00'); 

INSERT INTO "comments" VALUES (1, 'Absolutely fascinating! This really makes you think.', '2015-12-01 11:21:27', 2, 1);
INSERT INTO "comments" VALUES (2, 'Great points raised here. So much to consider.', '2015-10-04 14:44:56', NULL, 1);
INSERT INTO "comments" VALUES (3, 'I have been wondering about this topic lately. Thanks for the insights!', '2015-12-05 12:01:09', 4, 1);
INSERT INTO "comments" VALUES (4, 'This truly breaks down a complex subject into digestible pieces. Well done.', '2013-11-04 09:12:01', 4, 2);
INSERT INTO "comments" VALUES (5, 'Thought-provoking! I am definitely going to dive deeper into this.', '2013-10-22 05:43:06', 3, 2);
INSERT INTO "comments" VALUES (6, 'Could not agree more with these observations.', '2013-10-13 16:55:09', NULL, 2);
INSERT INTO "comments" VALUES (7, 'A really insightful take. It offers a fresh perspective.', '2014-12-05 07:46:07', 1, 3);
INSERT INTO "comments" VALUES (8, 'This sparked a few new ideas for me. Appreciate it!', '2014-11-12 05:44:00', 2, 3);
INSERT INTO "comments" VALUES (9, 'Fantastic read! It is rare to find such clarity on this.', '2014-12-05 04:11:52', NULL, 3);
INSERT INTO "comments" VALUES (10, 'This is exactly the kind of discussion we need more of.', '2011-09-28 22:55:11', 4, 4);
INSERT INTO "comments" VALUES (11, 'Very compelling arguments. You have convinced me!', '2011-08-06 20:45:07', 5, 4);
INSERT INTO "comments" VALUES (12, 'I found myself nodding along the whole time. Spot on.', '2011-12-25 20:33:47', NULL, 4);
INSERT INTO "comments" VALUES (13, 'This topic is so crucial right now. Thanks for addressing it.', '2012-10-07 12:00:12', 1, 5);
INSERT INTO "comments" VALUES (14, 'Always learning something new from posts like this.', '2012-10-04 08:54:44', 3, 5);
INSERT INTO "comments" VALUES (15, 'What a brilliant way to frame the issue.', '2012-12-01 01:41:27', NULL, 5);
INSERT INTO "comments" VALUES (16, 'This is a really insightful piece. It makes you pause and consider things from a different angle.', '2015-06-01 08:22:11', NULL, 6);
INSERT INTO "comments" VALUES (17, 'Spot on! I have been thinking about this a lot lately, and you have articulated it perfectly.', '2015-04-01 11:44:01', NULL, 6);
INSERT INTO "comments" VALUES (18, 'Such a clear and concise explanation of a complex topic. Much appreciated!', '2015-11-01 03:45:21', NULL, 6);
INSERT INTO "comments" VALUES (19, 'A powerful message delivered with precision.', '2012-09-08 04:15:23', 1, 7);
INSERT INTO "comments" VALUES (20, 'It is refreshing to see such a well-articulated argument.', '2012-10-10 12:16:46', 3, 7);
INSERT INTO "comments" VALUES (21, 'This resonates deeply with my own thoughts.', '2012-10-11 22:17:04', NULL, 7);
INSERT INTO "comments" VALUES (22, 'An excellent contribution to the conversation.', '2013-09-06 06:44:23', 5, 8);
INSERT INTO "comments" VALUES (23, 'This is the kind of content that truly adds value.', '2013-08-12 12:35:11', 5, 8);
INSERT INTO "comments" VALUES (24, 'I am already looking forward to more discussions on this!', '2013-11-03 09:44:56', NULL, 8);
INSERT INTO "comments" VALUES (25, 'Perfectly summarized. No wasted words.', '2014-11-23 14:12:01', 1, 9);
INSERT INTO "comments" VALUES (26, 'This opened my eyes to a few things I had not considered.', '2014-10-23 18:34:02', 3, 9);
INSERT INTO "comments" VALUES (27, 'So much wisdom packed into these lines.', '2014-12-23 19:56:03', NULL, 9);

INSERT INTO "interesting_flags" VALUES (1, 4);
INSERT INTO "interesting_flags" VALUES (1, 11);
INSERT INTO "interesting_flags" VALUES (2, 11);
INSERT INTO "interesting_flags" VALUES (2, 14);
INSERT INTO "interesting_flags" VALUES (3, 14);
INSERT INTO "interesting_flags" VALUES (3, 17);
INSERT INTO "interesting_flags" VALUES (4, 17);
INSERT INTO "interesting_flags" VALUES (4, 18);
INSERT INTO "interesting_flags" VALUES (4, 23);
INSERT INTO "interesting_flags" VALUES (5, 27);

COMMIT;