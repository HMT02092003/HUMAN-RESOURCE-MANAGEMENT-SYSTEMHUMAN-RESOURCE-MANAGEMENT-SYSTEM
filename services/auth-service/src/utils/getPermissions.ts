// // utils/getPermissions.ts

// import Cookies from 'universal-cookie';
// import { getDecodedToken } from './decode-token'; // Đảm bảo import đúng đường dẫn
// import { decodePermissions } from './decode-permisison'; // Đảm bảo import đúng đường dẫn

// interface Permissions {
//   [key: string]: {
//     read?: boolean;
//     update?: boolean;
//     create?: boolean;
//     delete?: boolean;
//     approve?: boolean;
//   };
// }

// export async function getPermissions(): Promise<Permissions | null> {
//   try {
//     const cookies = new Cookies();
//     const token = cookies.get('token');

//     if (!token) {
//       console.log('Token not found');
//       return null;
//     }

//     const decodedToken = getDecodedToken(token);

//     if (decodedToken) {
//       const tokenPermissions = decodedToken.permissions || {};

//       const decodedPermissions: Permissions = {};
//       for (const [key, value] of Object.entries(tokenPermissions)) {
//         if (typeof value === 'number') {
//           decodedPermissions[key] = decodePermissions(value);
//         }
//       }

//       return decodedPermissions;
//     } else {
//       console.error('Invalid token');
//       return null;
//     }
//   } catch (error) {
//     console.error('Error fetching permissions:', error);
//     return null;
//   }
// }
