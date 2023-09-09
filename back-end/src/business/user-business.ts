import { UserData } from '../data/user-data';
import { CustomError } from '../models/custom-error';
import { USER_DTO } from '../types/user-dto';
import { Authenticator } from '../services/authenticator';
import { HashManager } from '../services/hash-manager';
import { UserModel } from '../models/user-model';
import { IdGenerator } from '../services/id-generator';
import { User } from '@prisma/client';


export class UserBusiness {

    constructor(

        private userData: UserData,
        private authenticator: Authenticator,
        private hashManager: HashManager,
        private idGenerator: IdGenerator

    ) { }

    signup = async ( user: USER_DTO ) => {

        try {

            const { username, email, birthday, password } = user;

            if ( !username || !password || !email || !birthday ) throw new CustomError( 404, "one or more fields are empty" );
            if ( username.length > 20 ) throw new CustomError( 404, "username can be a maximum of 20 characters" );
            if ( username.length < 3 ) throw new CustomError( 400, "username field must be greater than 3" );
            if ( password.length < 6 ) throw new CustomError( 400, "Password must contain 6 characters or more" );
            if ( typeof username !== "string" || typeof email !== "string" || typeof birthday !== "string" ) throw new CustomError( 404, "fields needs to be a string" );
            if ( !email.includes( "@gmail.com" ) ) throw new CustomError( 400, "unsupported email" );

            //verificar se username ja esta em uso

            const passwordRegex: RegExp = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
            if ( !passwordRegex.test( password ) ) throw new CustomError( 400, 'The password must contain an uppercase character and a number' );

            const passwordAsHash = await this.hashManager.createHash( password );

            const hasUsername = await this.userData.checkUsername( username )
            if ( hasUsername ) throw new CustomError( 400, "username already registered" );

            const hasEmail = await this.userData.checkEmail( email )
            if ( hasEmail ) throw new CustomError( 400, "email already registered" );

            const id: string = this.idGenerator.generateId()
            await this.userData.signup( new UserModel( id, username.toLowerCase(), email, passwordAsHash, birthday ) );

            const token: string = this.authenticator.generateToken( { id: id } )
            return token;

        } catch ( error: any ) {
            throw new CustomError( error.statusCode, error.message )
        }

    }

    login = async ( email: string, password: string ) => {

        try {

            if ( !email || !password ) throw new CustomError( 400, 'one or more fields are empty' );
            if ( !email.includes( "@gmail.com" ) ) throw new CustomError( 400, "enter a valid email address" );

            const user = await this.userData.getUserByEmail( email )
            if ( !user ) throw new CustomError( 403, 'user not found' );

            const validatePassword = await this.hashManager.compareHash( password, user.password );
            if ( !validatePassword ) throw new CustomError( 401, 'incorrect password' );

            const token: string = this.authenticator.generateToken( { id: user.id } );
            return token;

        } catch ( error: any ) {
            throw new CustomError( error.statusCode, error.message )
        }

    }



}