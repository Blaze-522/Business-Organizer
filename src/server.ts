import inquirer from 'inquirer';
import { Client } from 'pg';

// Define interfaces for expected data structures
interface Department {
    id: number;
    name: string;
}

interface Role {
    id: number;
    title: string;
    salary: number;
    department_id: number;
}

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    role_id: number;
    manager_id: number | null;
}

// Setup the connection to the PostgreSQL database
const client = new Client({
    host: 'localhost',
    user: 'your_username',  // Use YOUR PostgreSQL credentials
    password: '135',
    database: 'company_db'
});

// Connect to PostgreSQL
client.connect((err: any) => {
    if (err) throw err;
    startApp();
});

// Function to start the application and present options
function startApp(): void {
    inquirer.prompt({
        name: 'action',
        type: 'list',
        message: 'What would you like to do?',
        choices: [
            'View all departments',
            'View all roles',
            'View all employees',
            'Add a department',
            'Add a role',
            'Add an employee',
            'Update an employee role',
            'Exit'
        ]
    }).then((answer: { action: any; }) => {
        switch (answer.action) {
            case 'View all departments':
                viewAllDepartments();
                break;
            case 'View all roles':
                viewAllRoles();
                break;
            case 'View all employees':
                viewAllEmployees();
                break;
            case 'Add a department':
                addDepartment();
                break;
            case 'Add a role':
                addRole();
                break;
            case 'Add an employee':
                addEmployee();
                break;
            case 'Update an employee role':
                updateEmployeeRole();
                break;
            case 'Exit':
                client.end();
                break;
        }
    });
}

// Function to view all departments
function viewAllDepartments(): void {
    client.query<Department>('SELECT * FROM department', (err: any, res: { rows: any; }) => {
        if (err) throw err;
        console.table(res.rows);
        startApp();
    });
}

// Function to view all roles
function viewAllRoles(): void {
    const query = `
        SELECT role.id, role.title, department.name AS department, role.salary 
        FROM role 
        JOIN department ON role.department_id = department.id;
    `;
    client.query<Role & { department: string }>(query, (err: any, res: { rows: any; }) => {
        if (err) throw err;
        console.table(res.rows);
        startApp();
    });
}

// Function to view all employees
function viewAllEmployees(): void {
    const query = `
        SELECT employee.id, employee.first_name, employee.last_name, role.title, 
               department.name AS department, role.salary, 
               CONCAT(manager.first_name, ' ', manager.last_name) AS manager
        FROM employee
        JOIN role ON employee.role_id = role.id
        JOIN department ON role.department_id = department.id
        LEFT JOIN employee manager ON employee.manager_id = manager.id;
    `;
    client.query<Employee & { title: string; department: string; salary: number; manager: string | null }>(query, (err: any, res: { rows: any; }) => {
        if (err) throw err;
        console.table(res.rows);
        startApp();
    });
}

// Function to add a department
function addDepartment(): void {
    inquirer.prompt({
        name: 'name',
        type: 'input',
        message: 'Enter the name of the department:'
    }).then((answer: { name: any; }) => {
        const query = 'INSERT INTO department (name) VALUES ($1)';
        client.query(query, [answer.name], (err: any, _res: any) => {
            if (err) throw err;
            console.log(`Department ${answer.name} added!`);
            startApp();
        });
    });
}

// Function to add a role
function addRole(): void {
    client.query<Department>('SELECT * FROM department', (err: any, res: { rows: any[]; }) => {
        if (err) throw err;
        const departments = res.rows.map((dept: { name: any; id: any; }) => ({ name: dept.name, value: dept.id }));
        inquirer.prompt([
            {
                name: 'title',
                type: 'input',
                message: 'Enter the title of the role:'
            },
            {
                name: 'salary',
                type: 'input',
                message: 'Enter the salary for the role:',
                validate: (value: string) => !isNaN(parseFloat(value)) || 'Please enter a valid number.'
            },
            {
                name: 'department',
                type: 'list',
                message: 'Select the department for the role:',
                choices: departments
            }
        ]).then((answers: { title: any; salary: string; department: any; }) => {
            const query = 'INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)';
            client.query(query, [answers.title, parseFloat(answers.salary), answers.department], (err: any, _res: any) => {
                if (err) throw err;
                console.log(`Role ${answers.title} added!`);
                startApp();
            });
        });
    });
}

// Function to add an employee
function addEmployee(): void {
    client.query<Role>('SELECT * FROM role', (err: any, res: { rows: { title: any; id: any; }[]; }) => {
        if (err) throw err;
        const roles = res.rows.map((role: { title: any; id: any; }) => ({ name: role.title, value: role.id }));
        
        client.query<Employee>('SELECT * FROM employee', (err: any, res: { rows: { first_name: any; last_name: any; id: any; }[]; }) => {
            if (err) throw err;
            const managers = res.rows.map((emp: { first_name: any; last_name: any; id: any; }) => ({ name: `${emp.first_name} ${emp.last_name}`, value: emp.id }));
            managers.push({ name: 'None', value: null });  // Option for no manager
            
            inquirer.prompt([
                {
                    name: 'first_name',
                    type: 'input',
                    message: "Enter the employee's first name:"
                },
                {
                    name: 'last_name',
                    type: 'input',
                    message: "Enter the employee's last name:"
                },
                {
                    name: 'role',
                    type: 'list',
                    message: "Select the employee's role:",
                    choices: roles
                },
                {
                    name: 'manager',
                    type: 'list',
                    message: "Select the employee's manager:",
                    choices: managers
                }
            ]).then((answers: { first_name: any; last_name: any; role: any; manager: any; }) => {
                const query = 'INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)';
                client.query(query, [answers.first_name, answers.last_name, answers.role, answers.manager], (err: any, _res: any) => {
                    if (err) throw err;
                    console.log(`Employee ${answers.first_name} ${answers.last_name} added!`);
                    startApp();
                });
            });
        });
    });
}

// Function to update an employee's role
function updateEmployeeRole(): void {
    client.query<Employee>('SELECT * FROM employee', (err: any, res: { rows: { first_name: any; last_name: any; id: any; }[]; }) => {
        if (err) throw err;
        const employees = res.rows.map((emp: { first_name: any; last_name: any; id: any; }) => ({ name: `${emp.first_name} ${emp.last_name}`, value: emp.id }));
        
        client.query<Role>('SELECT * FROM role', (err: any, res: { rows: any[]; }) => {
            if (err) throw err;
            const roles = res.rows.map(role => ({ name: role.title, value: role.id }));
            
            inquirer.prompt([
                {
                    name: 'employee',
                    type: 'list',
                    message: 'Select the employee to update:',
                    choices: employees
                },
                {
                    name: 'role',
                    type: 'list',
                    message: 'Select the new role for the employee:',
                    choices: roles
                }
            ]).then((answers: { role: any; employee: any; }) => {
                const query = 'UPDATE employee SET role_id = $1 WHERE id = $2';
                client.query(query, [answers.role, answers.employee], (err: any, _res: any) => {
                    if (err) throw err;
                    console.log(`Employee role updated!`);
                    startApp();
                });
            });
        });
    });
}
