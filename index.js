import {
  ApolloServer,
  gql,
  AuthenticationError,
  ForbiddenError,
} from 'apollo-server';
import _ from 'lodash';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

///const { ApolloServer, gql } = require("apollo-server");

const APP_SECRET =
  "App Secret Key; For example only! Don't define one in code!!!";

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Query {
    users: [User]
    faculties: [Student]
    students: [Faculty]
    student(email: String, id: ID): Student
    faculty(email: String, id: ID): Faculty
    courses: [Course]
    currentUser: User
  }
  type Mutation {
    loginUser(email: String!, password: String!): AuthPayload
    logoutUser: Boolean

    # Only Admin can create/update users
    createUser(user: UserInput): User
    updateUser(id: ID!, user: UserInput): User


    
    #createUser(name: String!, email: String!, role: Role!): User
     # Only Faculty can create/update and manage courses
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

  # extra credit: monitor when assignments are add
  type Subscription {
    assignmentAdded(studentID: ID!): Assignment
  }
  type AuthPayload {
    token: String
    user: User
  }
  input UserInput {
    # First and last name
    name: String!
    email: String!
    role: Role
    password: String
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
    assignments: [Assignment]
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

class UserSessions {
  userSessions = [];
  nextID = 0;

  getSession(sessionID) {
    const i = _.findIndex(this.userSessions, u => u.id === sessionID);
    return i === -1 ? null : this.userSessions[i];
  }

  createSession(userID, secret, expiresIn = 60 * 10) {
    const session = { id: this.nextID, userID: userID };
    this.nextID++;

    const token = jwt.sign({ id: userID, sessionID: session.id }, secret, {
      expiresIn,
    });

    this.userSessions.push(session);
    return token;
  }

  invalidateSession(sessionID) {
    this.userSessions = _.remove(this.userSessions, s => s.id === sessionID);
  }
}

class Users {
  constructor() {
    this.nextID = 7;
    this.users = [
      
      { id: 0, name: "zero", email: "zero@example.com", role: "Admin",...this.genSaltHashPassword('password'),},
      { id: 1, name: "one", email: "one@example.com", role: "Student",...this.genSaltHashPassword('password'),},
      { id: 2, name: "prof", email: "admin@example.com", role: "Faculty",...this.genSaltHashPassword('password'),},
      { id: 3, name: "sonali", email: "sonali@example.com", role: "Student",...this.genSaltHashPassword('password'),},
      { id: 4, name: "sam", email: "admin@example.com", role: "Faculty",...this.genSaltHashPassword('password'),},
      { id: 5, name: "shin", email: "admin@example.com", role: "Faculty",...this.genSaltHashPassword('password'), },
      { id: 6, name: "sam", email: "admin@example.com", role: "student",...this.genSaltHashPassword('password'), }
    ];
  }

  @function
  * @param {number} length - Length of the random string.
  */
 genRandomString = length => {
   return crypto
     .randomBytes(Math.ceil(length / 2))
     .toString('hex') /** convert to hexadecimal format */
     .slice(0, length); /** return required number of characters */
 };

 sha512 = (password, salt) => {
   var hash = crypto.createHmac(
     'sha512',
     salt,
   ); /** Hashing algorithm sha512 */
   hash.update(password);
   var value = hash.digest('hex');
   return {
     salt: salt,
     passwordHash: value,
   };
 };

 genSaltHashPassword = userpassword => {
   var salt = this.genRandomString(16); /** Gives us salt of length 16 */
   var passwordData = this.sha512(userpassword, salt);
   console.log('UserPassword = ' + userpassword);
   console.log('Passwordhash = ' + passwordData.passwordHash);
   console.log('nSalt = ' + passwordData.salt);
   return passwordData;
 };

 login(emailAddress, password) {
   // does a user with the specified emailAddress exist?
   const i = this.users.findIndex(({ email }) => email === emailAddress);
   if (i === -1) {
     throw new AuthenticationError('User not Found');
   }

   const user = this.users[i];

   // hash the password with the user salt
   const hashedPassword = this.sha512(password, user.salt).passwordHash;

   // compare the hashed password against the one in the user record
   if (hashedPassword !== user.passwordHash) {
     console.log(hashedPassword);
     console.log(user);
     throw new AuthenticationError('Bad Login or Password');
   }

   // create a jwt token and store
   //
   return {
     user: _.omit(user, ['passwordHash', 'salt']),
     token: userSessions.createSession(user.id, APP_SECRET),
   };
 }

  getUsers() {
    return this.users;
  }

  getStudents() {
    return this.users.filter(u => u.role === 'Student');
  }

  getStudentByEmail(email) {
    return this.getStudents().filter(s => s.email === email)[0] || null;
  }

  list() {
    return this.users;
  }

  get(id) {
    return this.users[id];
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
const userSessions = new UserSessions();
const courses = new Courses(users);
const assignments = new Assignment(courses);
const assignmentGrades = new AssignmentGrade(assignments, users);
// Provide resolver functions for your schema fields

//
const makeResolver = (resolver, options) => {
  // return an adorned resolver function
  return (root, args, context, info) => {
    const o = {
      requireUser: true,
      roles: ['Admin', 'Student', 'Faculty'],
    };
    const { requireUser } = o;
    const { roles } = o;
    let user = null;
    let sessionID = null;

    if (requireUser) {
      // get the token from the request
      const token = context.req.headers.authorization || '';
      if (!token) {
        throw new AuthenticationError('Token Required');
      }

      // retrieve the user given the token
      [user, sessionID] = getUserForToken(token);
      if (!user) {
        throw new AuthenticationError('Invalid Token or User');
      }

      // authorize the operation for the user
      const userRole = user.role;
      if (_.indexOf(roles, userRole) === -1) {
        throw new ForbiddenError('Operation Not Permitted');
      }
    }

    // call the passed resolver with context extended with user
    return resolver(
      root,
      args,
      { ...context, user: user, sessionID: sessionID },
      info,
    );
  };
};

const resolvers = {
  Query: {
    //hello: (root, args, context) => `Hello ${args.name}!`,
    users: makeResolver((root, args, context,info) => users.getUsers()),
    currentUser: makeResolver((root, args, context) => context.user),
    students: makeResolver((root, args, context,info) => users.filterUsers("Student")),
    faculties: makeResolver((root, args, context) => users.filterUsers("Faculty")),

    student: (root, args, context) =>
      users.fetchSingleUser(args.email, args.id, "Student"),
    faculty: (root, args, context) =>
      users.fetchSingleUser(args.email, args.id, "Faculty"),

    courses: (root, args, context) => courses.getCourses()
  },
  Mutation: {
    loginUser: makeResolver(
      (root, args, context, info) => {
        return users.login(args.email, args.password);
      },
      { requireUser: false },
    ),
    logoutUser: makeResolver((root, args, context, info) => {
      const sessionID = context.sessionID;
      userSessions.invalidateSession(sessionID);
      return true;
    }),
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
  },
  Student: {
    courses: student => {
      console.log('courses called');
      console.log(student);
      return [{ id: 0, name: 'course' }];
    },
  },
  Course: {
    professor: course => {
      console.log('course professor');
      return users.get(2);
    },
  },
};

const getUserForToken = token => {
  try {
    const { id, sessionID } = jwt.verify(token, APP_SECRET);
    const user = users.get(id);

    // get the user session
    const session = userSessions.getSession(sessionID);
    if (!session) {
      // If the session doesn't exist, it's been invalidated
      throw new AuthenticationError('Invalid Session');
    }

    return [user, session.id];
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      // invalidate the sesssion if expired
      const { sessionID } = jwt.decode(token);
      userSessions.invalidateSession(sessionID);
      throw new AuthenticationError('Session Expired');
    }
    throw new AuthenticationError('Bad Token');
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: request => {
    return request;
  },
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});




