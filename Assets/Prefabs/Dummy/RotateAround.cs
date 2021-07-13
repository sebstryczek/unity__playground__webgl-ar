using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class RotateAround : MonoBehaviour
{
    private float speed = 80.0f;

    private void Update()
    {
        this.transform.rotation = this.transform.rotation * Quaternion.Euler(speed * Time.deltaTime, 0, 0);
    }
}
