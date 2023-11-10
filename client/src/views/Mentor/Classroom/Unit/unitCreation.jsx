import React, { useEffect, useState } from 'react';
import './unitCreation.less';
import { message } from "antd"
import {getClassroom, createUnit} from '../../../../Utils/requests';
import MentorSubHeader from '../../../../components/MentorSubHeader/MentorSubHeader';

export default function unitCreation({ classroomId }) {
    const [classroom, setClassroom] = useState({});
    const [newUnitName, setNewUnitName] = useState("");

    useEffect(() => {
        const fetchData = async () => {
          const res = await getClassroom(classroomId);
          if (res.data) {
            const classroom = res.data;
            setClassroom(classroom);
            
          } else {
            message.error(res.err);
          }

        };
        fetchData();
      }, [classroomId]);

      const updateName = (e) => {
        setNewUnitName(e.target.value)
      }

      function handleSubmit(event){
        event.preventDefault()
        // send info to backend

        // success message
        message.success(`New Unit "${newUnitName}" was succesfully created`);

        // refresh everything
        setNewUnitName("");

      }

    return(
    <div className='all'>
        <MentorSubHeader
        title={'Create Unit'}
      />
      <div id='c_lesson'>
        <h3>Create Unit for <strong>{classroom.name}</strong></h3>
        <hr />
      <form onSubmit={handleSubmit}>
        <div className='fst'>
            <h4> Unit Name: </h4>
            <input className='textbox' type="text" onChange={updateName} value={newUnitName}/>
        </div>
        <input className='submitbtn' type="submit" value={"Create Unit"} />
        </form>
      </div>
    </div>);
}
