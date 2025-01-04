// Database configuration
import pkg from 'pg';
const { Client } = pkg;

const client = new Client ({
    user: 'postgres',
    host: 'localhost',
    database: 'mydb',
    password: '9851',
    port: 5432  // later will be handled
});

const insertQuery = `
  INSERT INTO fileattr (filename, filesize, fileext, createdate, lastmodified)
  VALUES ($1, $2, $3, $4, $5)
`;

client.connect()
// error handling

const insertIntoDB = (fileName, fileSize, fileExt, creationDate, lastModified) => {
    const tableAttr = [fileName, fileSize, fileExt, creationDate, lastModified];
    
    client.query(insertQuery, tableAttr)
        .then(res => {
            console.log('File metadata inserted into DB');
        })
        .catch(err => {
            console.error('Error inserting file metadata', err.stack);
        });
};

export { insertIntoDB };