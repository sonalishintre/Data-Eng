const { ApolloServer, gql } = require("apollo-server");

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Query {
    hello(name: String!): String
    users: [User]
    faculties: [Student]
    students: [Faculty]
    student(email: String, id: ID): Student
    faculty(email: String, id: ID): Faculty
    courses: [Course]
  }
  type Mutation {
    createUser(name: String!, email: String!, role: Role!): User
    createCourse(name: String!, facultyID: ID!): Course
    deleteCourse(courseID: ID!): Course
    addCourseStudent(courseID: ID!, studentID: ID!): Course
    deleteCourseStudent(courseID: ID!, studentID: ID!): Course
    createAssignment(courseID: ID!, name: String!): Assignment
    deleteAssignment(assignmentID: ID!): Assignment
    createAssignmentGrade(
      assignmentID: ID!
      studentID: ID!
      grade: Float!
    ): AssignmentGrade
  }
  enum Role {
    Admin
    Student
    Faculty
  }
  interface User {
    id: ID!
    name: String!
    email: String!
    role: Role!
  }
  type Student implements User {
    id: ID!
    name: String!
    email: String!
    role: Role!
    courses: [Course]
    gpa: Float!
  }
  type Faculty implements User {
    id: ID!
    name: String!
    email: String!
    role: Role!
    courses: [Course]
  }
  type Admin implements User {
    id: ID!
    name: String!
    email: String!
    role: Role!
  }
  type Course {
    id: ID!
    name: String!
    professor: Faculty
    students: [Student]
    assignments: [Assignment]
  }
  type Assignment {
    id: ID!
    name: String!
    course: Course!
    grades: [AssignmentGrade]
  }
  type AssignmentGrade {
    id: ID!
    assignment: Assignment
    student: User
    grade: String!
  }
`;
class Users {
  constructor() {
    this.nextID = 7;
    this.users = [
      { id: 0, name: "zero", email: "zero@example.com", role: "Admin" },
      { id: 1, name: "one", email: "one@example.com", role: "Student" },
      { id: 2, name: "prof", email: "admin@example.com", role: "Faculty" },
      { id: 3, name: "sonali", email: "sonali@example.com", role: "Student" },
      { id: 4, name: "sam", email: "admin@example.com", role: "Faculty" },
      { id: 5, name: "shin", email: "admin@example.com", role: "Faculty"},
      { id: 6, name: "sam", email: "admin@example.com", role: "student"}  
      ];
  }

  getUsers() {
    return this.users;
  }

  create(name, email, role) {
    const new_user = { id: this.nextID, name: name, email: email, role: role };
    this.users.push(new_user);
    this.nextID++;
    return new_user;
  }

  filterUsers(role) {
    const result = [];
    for (const user of this.users) {
      if (user.role === role) {
        result.push(user);
      }
    }
    return result;
  }

  fetchSingleUser(email, id, role) {
    for (const user of this.users) {
      if (
        user.role === role &&
        (user.email === email || user.id === parseInt(id))
      ) {
        return user;
      }
    }
    return null;
  }
}

class Courses {
  constructor(users) {
    this.users = users;
    this.nextID = 0;
    this.courses = [];
  }

  getCourses() {
    return this.courses;
  }

  create(name, facultyID) {
    const faculty = this.users.fetchSingleUser("", facultyID, "Faculty");
    if (faculty === null) return null;
    const new_course = { id: this.nextID, name: name, professor: faculty };

    this.courses.push(new_course);

    if (faculty.courses === undefined) {
      faculty.courses = [new_course];
    } else {
      faculty.courses.push(new_course);
    }
    this.nextID++;

    return new_course;
  }

  getCourseByID(courseID) {
    for (const course of this.courses) {
      if (course.id === parseInt(courseID)) {
        return course;
      }
    }
    return null;
  }

  deleteCourse(courseID) {
    for (const course of this.courses) {
      if (course.id === parseInt(courseID)) {
        const faculty = this.users.fetchSingleUser(
          "",
          course.professor.id,
          "Faculty"
        );
        const index_faculty = faculty.courses.indexOf(course);
        faculty.courses.splice(index_faculty, 1);

        const index_course = this.courses.indexOf(course);
        this.courses.splice(index_course, 1);

        return course;
      }
    }
    return null;
  }

  addCourseStudent(courseID, studentID) {
    const student = this.users.fetchSingleUser("", studentID, "Student");

    if (student === null) return null;
    for (const course of this.courses) {
      if (course.id === parseInt(courseID)) {
        if (course.students === undefined) {
          course.students = [student];
        } else {
          if (course.students.indexOf(student) !== -1) {
            return null;
          } else {
            course.students.push(student);
          }
        }

        if (student.courses === undefined) {
          student.courses = [course];
        } else {
          student.courses.push(course);
        }

        return course;
      }
    }
    return null;
  }

  deleteCourseStudent(courseID, studentID) {
    const student = this.users.fetchSingleUser("", studentID, "Student");
    if (student === null) return null;
    for (const course of this.courses) {
      if (course.id === parseInt(courseID)) {
        if (course.students === undefined) {
          return null;
        } else {
          const index = course.students.indexOf(student);
          if (index === -1) {
            return null;
          } else {
            const index_student = student.courses.indexOf(course);
            student.courses.splice(index_student, 1);

            course.students.splice(index, 1);

            return course;
          }
        }
      }
    }
    return null;
  }
}

class Assignment {
  constructor(courses) {
    this.courses = courses;
    this.nextID = 0;
    this.assignments = [];
  }

  getAssignmentByID(assignmentID) {
    for (const assignment of this.assignments) {
      if (assignment.id === parseInt(assignmentID)) {
        return assignment;
      }
    }
    return null;
  }

  createAssignment(courseID, name) {
    const course = this.courses.getCourseByID(courseID);
    if (course === null) return null;
    const new_assignment = { id: this.nextID, name: name, course: course };
    this.assignments.push(new_assignment);
    this.nextID++;
    return new_assignment;
  }

  deleteAssignment(assignmentID) {
    for (const assignment of this.assignments) {
      if (assignment.id === parseInt(assignmentID)) {
        const index_assignment = this.assignments.indexOf(assignment);
        this.assignments.splice(index_assignment, 1);

        return assignment;
      }
    }
    return null;
  }
}

class AssignmentGrade {
  constructor(assignments, students) {
    this.assignments = assignments;
    this.students = students;
    this.nextID = 0;
    this.assignment_grades = [];
  }

  createAssignmentGrade(assignmentID, studentID, grade) {
    const assignment = this.assignments.getAssignmentByID(assignmentID);
    if (assignment === null) return null;

    const student = this.students.fetchSingleUser("", studentID, "Student");
    if (student === null) return null;

    const new_assignment_grade = {
      id: this.nextID,
      assignment: assignment,
      student: student,
      grade: grade
    };
    this.assignment_grades.push(new_assignment_grade);
    this.nextID++;
    return new_assignment_grade;
  }
}

const users = new Users();
const courses = new Courses(users);
const assignments = new Assignment(courses);
const assignmentGrades = new AssignmentGrade(assignments, users);
// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: (root, args, context) => `Hello ${args.name}!`,
    users: (root, args, context) => users.getUsers(),

    students: (root, args, context) => users.filterUsers("Student"),
    faculties: (root, args, context) => users.filterUsers("Faculty"),

    student: (root, args, context) =>
      users.fetchSingleUser(args.email, args.id, "Student"),
    faculty: (root, args, context) =>
      users.fetchSingleUser(args.email, args.id, "Faculty"),

    courses: (root, args, context) => courses.getCourses()
  },
  Mutation: {
    createUser: (root, args, context) =>
      users.create(args.name, args.email, args.role),

    createCourse: (root, args, context) =>
      courses.create(args.name, args.facultyID),
    deleteCourse: (root, args, context) => courses.deleteCourse(args.courseID),
    addCourseStudent: (root, args, context) =>
      courses.addCourseStudent(args.courseID, args.studentID),
    deleteCourseStudent: (root, args, context) =>
      courses.deleteCourseStudent(args.courseID, args.studentID),

    createAssignment: (root, args, context) =>
      assignments.createAssignment(args.courseID, args.name),
    deleteAssignment: (root, args, context) =>
      assignments.deleteAssignment(args.assignmentID),

    createAssignmentGrade: (root, args, context) =>
      assignmentGrades.createAssignmentGrade(
        args.assignmentID,
        args.studentID,
        args.grade
      )
  },
  User: {
    __resolveType: (user, context, info) => user.role
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
