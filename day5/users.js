
// Select the HTML elements
const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

// Store the users returned by the API
let users = [];

// Fetch users from the API
async function loadUsers() {
    loadButton.disabled = true;
    statusMessage.textContent = "Loading users...";
    usersList.textContent = "";

    try {
        const response = await fetch(
            "https://jsonplaceholder.typicode.com/users"
        );

        // Check whether the request succeeded
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        // Convert the response to JavaScript data
        const data = await response.json();

        // Save the users in our array
        users = data;

        // Display all users
        renderUsers(users);

        statusMessage.textContent = `Successfully loaded ${users.length} users.`;
    } catch (error) {
        console.error("Error loading users:", error);
        users = [];
        usersList.textContent = "";
        statusMessage.textContent =
            "Sorry, users could not be loaded. Please try again.";
    } finally {
        // Always enable the button again, even if an error occurs
        loadButton.disabled = false;
    }
}

// Display any array of users
function renderUsers(list) {
    usersList.textContent = "";

    if (list.length === 0) {
        const message = document.createElement("li");
        message.textContent = "No users match your filter.";
        usersList.appendChild(message);
        return;
    }

    list.forEach(function (user) {
        const userItem = document.createElement("li");
        userItem.classList.add("user-card");

        const name = document.createElement("h3");
        name.textContent = user.name;

        const email = document.createElement("p");
        email.textContent = `Email: ${user.email}`;

        const city = document.createElement("p");
        city.textContent = `City: ${user.address.city}`;

        const company = document.createElement("p");
        company.textContent = `Company: ${user.company.name}`;

        userItem.appendChild(name);
        userItem.appendChild(email);
        userItem.appendChild(city);
        userItem.appendChild(company);

        usersList.appendChild(userItem);
    });
}

// Load users when the button is clicked
loadButton.addEventListener("click", loadUsers);

// Filter the stored users as the user types
filterInput.addEventListener("input", function () {
    const searchText = filterInput.value.trim().toLowerCase();

    const filteredUsers = users.filter(function (user) {
        return user.name.toLowerCase().includes(searchText);
    });

    renderUsers(filteredUsers);
});

