Library Books REST API
Overview

This document describes a REST API for managing books in a library. The API uses HTTP methods to create, retrieve, update, and delete books.

Base URL: /api

Each book has an ID, title, author, publication year, and ISBN.

Endpoints
1. List all books
Method: GET
Path: /api/books
Description: Returns a list of all books in the library.
Example request body: None.
Success status: 200 OK
2. Get one book
Method: GET
Path: /api/books/{id}
Description: Returns the details of a book with the specified ID.
Example request body: None.
Success status: 200 OK

Example path: /api/books/12

3. Create a book
Method: POST
Path: /api/books
Description: Creates a new book in the library.
Example request body:
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publicationYear": 1958,
  "isbn": "9780385474542"
}
Success status: 201 Created
4. Update a book
Method: PUT
Path: /api/books/{id}
Description: Replaces the details of an existing book.
Example request body:
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publicationYear": 1958,
  "isbn": "9780385474542"
}
Success status: 200 OK
5. Delete a book
Method: DELETE
Path: /api/books/{id}
Description: Deletes the book with the specified ID.
Example request body: None.
Success status: 204 No Content
6. List books by author
Method: GET
Path: /api/books?author=Chinua%20Achebe
Description: Returns books whose author matches the supplied author query parameter.
Example request body: None. The author is supplied in the query string.
Success status: 200 OK
Error Responses
400 Bad Request

This status is returned when the request contains invalid data.

Example: A client tries to create a book without a title or supplies an invalid publication year.

404 Not Found

This status is returned when the requested resource does not exist.

Example: A client requests /api/books/999 but no book with ID 999 exists.

Notes
Use JSON for request bodies when creating or updating books.
Use the appropriate HTTP method for each operation.
Validate incoming data before saving it.
Return clear error messages to help clients understand failed requests.